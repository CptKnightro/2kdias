import type { CollectionConfig } from 'payload'
import { commissionerOnly, publicRead, isCommissioner } from '@/access/roles'

export const Franchises: CollectionConfig = {
  slug: 'franchises',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'owner', 'purseTotal', 'purseSpent'],
    group: 'League',
  },
  access: {
    read: publicRead,
    create: commissionerOnly,
    // owners can edit their own franchise's cosmetic fields; commissioner edits all
    update: ({ req: { user }, id }) => {
      if (isCommissioner(user)) return true
      const fid = typeof user?.franchise === 'object' ? user?.franchise?.id : user?.franchise
      return fid === id
    },
    delete: commissionerOnly,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { width: '60%' } },
        {
          name: 'slug',
          type: 'text',
          unique: true,
          index: true,
          admin: { width: '40%', description: 'URL handle, e.g. "dais-dynasty"' },
          hooks: {
            beforeValidate: [
              ({ value, data }) =>
                value ||
                data?.name
                  ?.toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/(^-|-$)/g, ''),
            ],
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'logo', type: 'upload', relationTo: 'media', admin: { width: '50%' } },
        {
          name: 'color',
          type: 'text',
          defaultValue: '#DF2604',
          admin: { width: '50%', description: 'Team accent (hex).' },
        },
      ],
    },
    { name: 'bio', type: 'textarea' },
    // ── sidebar ─────────────────────────────────────────────────
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar' },
    },
    {
      name: 'purseTotal',
      type: 'number',
      defaultValue: 100,
      admin: {
        position: 'sidebar',
        description: 'Total budget for the auction.',
      },
      access: { update: ({ req: { user } }) => isCommissioner(user) },
    },
    {
      name: 'purseSpent',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Maintained automatically as players are won.',
      },
    },
    {
      name: 'established',
      type: 'number',
      admin: { position: 'sidebar', description: 'Season founded.' },
    },
  ],
}
