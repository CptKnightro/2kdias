import type { CollectionConfig } from 'payload'
import { authenticated, publicRead } from '@/access/roles'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'League' },
  access: {
    read: publicRead,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  upload: {
    // Stored on Supabase Storage via the S3 plugin (see payload.config.ts).
    // Disable local disk so it works on Vercel serverless.
    disableLocalStorage: true,
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
}
