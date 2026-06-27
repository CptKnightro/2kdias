import type { CollectionConfig } from 'payload'
import { authenticated, publicRead, isCommissioner } from '@/access/roles'

export const Trades: CollectionConfig = {
  slug: 'trades',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['fromFranchise', 'toFranchise', 'status', 'createdAt'],
    group: 'Transactions',
  },
  access: {
    read: publicRead,
    create: authenticated,
    update: authenticated, // counter/accept/reject handled in UI + hooks
    delete: ({ req: { user } }) => isCommissioner(user),
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'fromFranchise',
          type: 'relationship',
          relationTo: 'franchises',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'toFranchise',
          type: 'relationship',
          relationTo: 'franchises',
          required: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'offeredPlayers',
      type: 'relationship',
      relationTo: 'players',
      hasMany: true,
      maxRows: 3, // league rule: offer at most 3 players
      admin: { description: 'Players the proposer gives up (max 3).' },
    },
    {
      name: 'requestedPlayers',
      type: 'relationship',
      relationTo: 'players',
      hasMany: true,
      maxRows: 3, // league rule: request at most 3 players
      admin: { description: 'Players the proposer wants (max 3).' },
    },
    {
      name: 'cashAdjustment',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Currency from → to (negative = the other way).' },
    },
    { name: 'note', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'proposed',
      options: [
        { label: 'Proposed', value: 'proposed' },
        { label: 'Countered', value: 'countered' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Vetoed', value: 'vetoed' },
        // Auto-set once `expiresAt` passes on a still-open offer (see src/lib/trades.ts).
        { label: 'Expired', value: 'expired' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'expiresAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        description:
          'Accept-by deadline — auto-expires the offer if not settled (max 3 months out).',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'startsAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Loan start — set when the trade is accepted. Players move to the other team.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'endsAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Loan end — players revert to their original teams once this passes.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'proposedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', readOnly: true },
      hooks: {
        beforeChange: [
          ({ req, value, operation }) => (operation === 'create' ? req.user?.id : value),
        ],
      },
    },
  ],
}
