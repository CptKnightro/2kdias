import type { CollectionConfig } from 'payload'
import { commissionerOnly, publicRead } from '@/access/roles'

// Auto-populated league feed (auction wins, trades, results). Rows are written
// by hooks on other collections via payload.create({ overrideAccess: true }).
export const Activity: CollectionConfig = {
  slug: 'activity',
  admin: {
    useAsTitle: 'message',
    defaultColumns: ['type', 'message', 'createdAt'],
    group: 'League',
  },
  access: {
    read: publicRead,
    create: commissionerOnly,
    update: commissionerOnly,
    delete: commissionerOnly,
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Auction', value: 'auction' },
        { label: 'Trade', value: 'trade' },
        { label: 'Match', value: 'match' },
        { label: 'Award', value: 'award' },
        { label: 'System', value: 'system' },
      ],
      defaultValue: 'system',
    },
    { name: 'message', type: 'text', required: true },
    { name: 'franchise', type: 'relationship', relationTo: 'franchises' },
  ],
}
