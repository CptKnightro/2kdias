import type { CollectionConfig } from 'payload'
import { authenticated, commissionerOnly, isCommissioner } from '@/access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'franchise'],
    group: 'League',
  },
  auth: true,
  access: {
    read: authenticated,
    create: commissionerOnly,
    // commissioners manage everyone; owners can edit their own record
    update: ({ req: { user }, id }) =>
      isCommissioner(user) ? true : user?.id === id,
    delete: commissionerOnly,
    admin: ({ req: { user } }) => Boolean(user), // owners can use the panel too
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'owner',
      options: [
        { label: 'Commissioner', value: 'commissioner' },
        { label: 'Owner', value: 'owner' },
      ],
      access: {
        // only commissioners can change roles
        update: ({ req: { user } }) => isCommissioner(user),
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'franchise',
      type: 'relationship',
      relationTo: 'franchises',
      admin: {
        position: 'sidebar',
        description: 'The team this owner controls.',
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}
