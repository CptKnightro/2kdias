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
      admin: { description: 'Players the proposer gives up.' },
    },
    {
      name: 'requestedPlayers',
      type: 'relationship',
      relationTo: 'players',
      hasMany: true,
      admin: { description: 'Players the proposer wants.' },
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
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'proposedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', readOnly: true },
      hooks: {
        beforeChange: [({ req, value, operation }) => (operation === 'create' ? req.user?.id : value)],
      },
    },
  ],
}
