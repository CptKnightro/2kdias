import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { authenticated, publicRead, isCommissioner } from '@/access/roles'

export const Bids: CollectionConfig = {
  slug: 'bids',
  admin: {
    useAsTitle: 'amount',
    defaultColumns: ['amount', 'franchise', 'player', 'bidder', 'createdAt'],
    group: 'Auction',
  },
  access: {
    read: publicRead, // everyone subscribes to the live bid feed
    create: authenticated, // owners place bids
    update: () => false, // bids are immutable
    delete: ({ req: { user } }) => isCommissioner(user),
  },
  hooks: {
    // Validate against live lot state + purse (no squad cap in this league).
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation !== 'create' || !data) return data
        const { payload, user } = req

        const auctionId = typeof data.auction === 'object' ? data.auction?.id : data.auction
        if (!auctionId) throw new APIError('Bid must reference an auction.', 400)

        const auction = await payload.findByID({
          collection: 'auctions',
          id: auctionId,
          depth: 0,
          req,
        })

        if (auction.status !== 'live') throw new APIError('Auction is not live.', 400)
        if (!['open', 'going1', 'going2'].includes(auction.lotStatus || ''))
          throw new APIError('No lot is open for bidding.', 400)

        // Pin the bid to the current lot's player.
        data.player = auction.currentPlayer

        const franchiseId = typeof data.franchise === 'object' ? data.franchise?.id : data.franchise
        if (!franchiseId) throw new APIError('Bid must reference a franchise.', 400)

        // A signed-in owner may only bid for their own franchise. Public
        // bidders are login-free — they pick a team on the auction page — so
        // there is no user to pin against; the picked franchise stands.
        if (user && !isCommissioner(user)) {
          const ownFid = typeof user?.franchise === 'object' ? user?.franchise?.id : user?.franchise
          if (ownFid !== franchiseId) throw new APIError('You can only bid for your own team.', 403)
        }

        const increment = auction.minIncrement ?? 1
        const floor = auction.currentHighBid ?? 0
        const minValid = auction.currentHighFranchise
          ? floor + increment
          : Math.max(floor, increment)
        if ((data.amount ?? 0) < minValid)
          throw new APIError(`Bid must be at least ${minValid}.`, 400)

        // Purse check — the league has no squad-size cap, so bids are only
        // limited by a team's remaining wallet.
        const franchise = await payload.findByID({
          collection: 'franchises',
          id: franchiseId,
          depth: 0,
          req,
        })
        const remaining = (franchise.purseTotal ?? 0) - (franchise.purseSpent ?? 0)
        if ((data.amount ?? 0) > remaining)
          throw new APIError(`Not enough purse (${remaining} remaining).`, 400)

        data.bidder = user?.id
        return data
      },
    ],
    // Advance the live high bid on the auction so everyone sees it.
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation !== 'create') return
        const auctionId = typeof doc.auction === 'object' ? doc.auction?.id : doc.auction
        await req.payload.update({
          collection: 'auctions',
          id: auctionId,
          data: {
            currentHighBid: doc.amount,
            currentHighFranchise:
              typeof doc.franchise === 'object' ? doc.franchise?.id : doc.franchise,
            lotStatus: 'open', // reset any "going once/twice" on a fresh bid
          },
          req,
          overrideAccess: true,
        })
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'auction',
          type: 'relationship',
          relationTo: 'auctions',
          required: true,
          admin: { width: '50%' },
        },
        { name: 'amount', type: 'number', required: true, admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'franchise',
          type: 'relationship',
          relationTo: 'franchises',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'player',
          type: 'relationship',
          relationTo: 'players',
          admin: { width: '50%', readOnly: true },
        },
      ],
    },
    {
      name: 'bidder',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
  ],
}
