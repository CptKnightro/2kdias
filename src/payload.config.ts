import { postgresAdapter } from '@payloadcms/db-postgres'
import { s3Storage } from '@payloadcms/storage-s3'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig, type Plugin } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Franchises } from './collections/Franchises'
import { Players } from './collections/Players'
import { Auctions } from './collections/Auctions'
import { Bids } from './collections/Bids'
import { Trades } from './collections/Trades'
import { Tournaments } from './collections/Tournaments'
import { Matches } from './collections/Matches'
import { Awards } from './collections/Awards'
import { Activity } from './collections/Activity'
import { LeagueSettings } from './globals/LeagueSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Supabase Storage (S3-compatible) — only enabled when credentials exist so
// local boot works without them.
const plugins: Plugin[] = []
if (process.env.S3_ACCESS_KEY_ID && process.env.S3_ENDPOINT) {
  plugins.push(
    s3Storage({
      collections: { media: true },
      bucket: process.env.S3_BUCKET || 'media',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'us-east-1',
        forcePathStyle: true, // required for Supabase
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      },
    }),
  )
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: '— 2KDais',
    },
  },
  collections: [
    Users,
    Media,
    Franchises,
    Players,
    Auctions,
    Bids,
    Trades,
    Tournaments,
    Matches,
    Awards,
    Activity,
  ],
  globals: [LeagueSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
    // Runtime uses Supabase's transaction pooler (6543); migrations run against
    // DATABASE_URI_DIRECT (5432) via the migrate scripts.
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins,
})
