import type { CollectionConfig } from 'payload'
import { commissionerOnly, publicRead } from '@/access/roles'

export const Trophies: CollectionConfig = {
  slug: 'trophies',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'winners'],
    group: 'Competition',
  },
  access: {
    read: publicRead,
    create: commissionerOnly,
    update: commissionerOnly,
    delete: commissionerOnly,
  },
  hooks: {
    beforeChange: [
      // A "final" trophy has exactly one holder — awarding it again replaces
      // the previous winner (keep only the most recently added entry).
      ({ data }) => {
        if (data?.kind === 'final' && Array.isArray(data.winners) && data.winners.length > 1) {
          data.winners = [data.winners[data.winners.length - 1]]
        }
        return data
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { width: '60%' } },
        {
          name: 'kind',
          type: 'select',
          required: true,
          defaultValue: 'recurring',
          options: [
            { label: 'Recurring — every ring holder shows', value: 'recurring' },
            { label: 'Final — one winner only', value: 'final' },
          ],
          admin: { width: '40%' },
        },
      ],
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'winners',
      type: 'array',
      labels: { singular: 'Winner', plural: 'Winners' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'franchise',
              type: 'relationship',
              relationTo: 'franchises',
              required: true,
              admin: { width: '60%' },
            },
            {
              name: 'season',
              type: 'text',
              admin: { width: '40%', description: 'Season / edition label, e.g. "S1" or "2026"' },
            },
          ],
        },
      ],
    },
  ],
}
