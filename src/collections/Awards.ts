import type { CollectionConfig } from 'payload'
import { commissionerOnly, publicRead } from '@/access/roles'

export const Awards: CollectionConfig = {
  slug: 'awards',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'season', 'franchise', 'player'],
    group: 'Competition',
  },
  access: {
    read: publicRead,
    create: commissionerOnly,
    update: commissionerOnly,
    delete: commissionerOnly,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Champion', value: 'champion' },
            { label: 'MVP', value: 'mvp' },
            { label: 'Defensive POY', value: 'dpoy' },
            { label: 'Most Improved', value: 'mip' },
            { label: 'GOAT Owner', value: 'goat-owner' },
            { label: 'Other', value: 'other' },
          ],
          admin: { width: '50%' },
        },
        { name: 'season', type: 'text', admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'franchise',
          type: 'relationship',
          relationTo: 'franchises',
          admin: { width: '50%' },
        },
        {
          name: 'player',
          type: 'relationship',
          relationTo: 'players',
          admin: { width: '50%' },
        },
      ],
    },
    { name: 'note', type: 'textarea' },
  ],
}
