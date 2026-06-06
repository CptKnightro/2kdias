import type { CollectionConfig } from 'payload'
import { commissionerOnly, publicRead } from '@/access/roles'

export const Auctions: CollectionConfig = {
  slug: 'auctions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'currentPlayer', 'currentHighBid', 'lotStatus'],
    group: 'Auction',
  },
  access: {
    read: publicRead, // owners subscribe to live lot state
    create: commissionerOnly,
    update: commissionerOnly, // auctioneer controls; bids update via Bids hook (overrideAccess)
    delete: commissionerOnly,
  },
  fields: [
    { name: 'title', type: 'text', required: true, defaultValue: 'Season Auction' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'scheduled',
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Live', value: 'live' },
        { label: 'Ended', value: 'ended' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      type: 'collapsible',
      label: 'Auction rules',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'squadCap',
              type: 'number',
              defaultValue: 12,
              admin: { width: '33%', description: 'Max players per team.' },
            },
            {
              name: 'minIncrement',
              type: 'number',
              defaultValue: 1,
              admin: { width: '33%', description: 'Minimum raise.' },
            },
            {
              name: 'timerSeconds',
              type: 'number',
              defaultValue: 20,
              admin: { width: '34%', description: 'Countdown per lot.' },
            },
          ],
        },
      ],
    },
    // ── live lot state (updated by auctioneer + bid hook) ───────
    {
      type: 'collapsible',
      label: 'Live lot',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'currentPlayer',
          type: 'relationship',
          relationTo: 'players',
          admin: { description: 'Player currently on the block.' },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'lotStatus',
              type: 'select',
              defaultValue: 'idle',
              options: [
                { label: 'Idle', value: 'idle' },
                { label: 'Open', value: 'open' },
                { label: 'Going once', value: 'going1' },
                { label: 'Going twice', value: 'going2' },
                { label: 'Sold', value: 'sold' },
                { label: 'Unsold', value: 'unsold' },
              ],
              admin: { width: '50%' },
            },
            { name: 'currentHighBid', type: 'number', admin: { width: '50%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'currentHighFranchise',
              type: 'relationship',
              relationTo: 'franchises',
              admin: { width: '50%' },
            },
            {
              name: 'timerEndsAt',
              type: 'date',
              admin: {
                width: '50%',
                date: { pickerAppearance: 'dayAndTime' },
                description: 'When the current lot countdown ends.',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'queue',
      type: 'relationship',
      relationTo: 'players',
      hasMany: true,
      admin: { description: 'Ordered list of players to auction.' },
    },
  ],
}
