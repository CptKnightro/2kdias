import type { CollectionConfig } from 'payload'
import { authenticated, commissionerOnly, isCommissioner } from '@/access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'franchise'],
    group: 'League',
  },
  auth: {
    // Sessions last 10 hours, then the token expires and the user must sign in
    // again — no silent auto-refresh.
    tokenExpiration: 60 * 60 * 10, // 10 hours (seconds)
    // Brute-force protection: lock the account for 10 min after 5 bad attempts.
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // ms
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
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
