import type { CollectionConfig } from 'payload'
import { commissionerOnly, publicRead } from '@/access/roles'
import { suggestedBasePrice } from '@/lib/rarity'
import { PLAYER_CATEGORIES, POSITIONS, PLAYER_STATUSES } from '@/lib/constants'

export const Players: CollectionConfig = {
  slug: 'players',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'position', 'ovr', 'nbaTeam', 'status', 'franchise'],
    group: 'Auction',
    listSearchableFields: ['name', 'nbaTeam'],
  },
  access: {
    read: publicRead,
    create: commissionerOnly,
    update: commissionerOnly,
    delete: commissionerOnly,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Seed a base price from OVR if missing.
        if (typeof data.ovr === 'number' && data.basePrice == null) {
          data.basePrice = suggestedBasePrice(data.ovr)
        }
        return data
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'rank', type: 'number', admin: { width: '25%', description: 'CSV rank' } },
        { name: 'name', type: 'text', required: true, admin: { width: '75%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'position',
          type: 'select',
          required: true,
          options: POSITIONS.map((p) => ({ label: p, value: p })),
          admin: { width: '33%' },
        },
        {
          name: 'ovr',
          type: 'number',
          required: true,
          min: 0,
          max: 99,
          admin: { width: '33%', description: 'Overall rating' },
        },
        {
          name: 'category',
          type: 'select',
          options: PLAYER_CATEGORIES.map((c) => ({ label: c, value: c })),
          admin: { width: '34%' },
        },
      ],
    },
    {
      name: 'nbaTeam',
      type: 'text',
      label: 'NBA Team',
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
    // ── sidebar: auction state ──────────────────────────────────
    {
      name: 'basePrice',
      type: 'number',
      min: 0,
      admin: { position: 'sidebar', description: 'Starting auction price.' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'available',
      options: PLAYER_STATUSES.map((s) => ({ label: s, value: s })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'franchise',
      type: 'relationship',
      relationTo: 'franchises',
      admin: { position: 'sidebar', description: 'Current owning team (if sold).' },
    },
    {
      name: 'soldPrice',
      type: 'number',
      min: 0,
      admin: { position: 'sidebar', description: 'Final hammer price.' },
    },
  ],
}
