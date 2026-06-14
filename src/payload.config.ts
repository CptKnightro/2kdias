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
import { withRevalidation, withGlobalRevalidation } from './lib/revalidate'

// Which frontend pages depend on each collection. Editing a collection in the
// admin purges exactly these cached pages (see src/lib/revalidate.ts).
const TEAM_PAGE = { path: '/teams/[slug]', type: 'page' as const }
const TOURNEY_PAGE = { path: '/tournaments/[id]', type: 'page' as const }
const ALL_PAGES = [
  '/',
  '/teams',
  TEAM_PAGE,
  '/players',
  '/standings',
  '/records',
  '/trades',
  '/matches',
  '/tournaments',
  TOURNEY_PAGE,
]

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
    withRevalidation(Franchises, ['/', '/teams', TEAM_PAGE, '/standings']),
    withRevalidation(Players, ['/', '/players', '/teams', TEAM_PAGE]),
    Auctions, // live auction page is dynamic — no cache to purge
    Bids, // live auction page is dynamic — no cache to purge
    withRevalidation(Trades, ['/', '/trades', '/players', '/teams', TEAM_PAGE]),
    withRevalidation(Tournaments, ['/', '/tournaments', TOURNEY_PAGE, '/standings']),
    withRevalidation(Matches, ['/', '/standings', '/records', '/matches', TOURNEY_PAGE]),
    withRevalidation(Awards, ['/', '/records']),
    withRevalidation(Activity, ['/']),
  ],
  // Currency name/symbol from league settings renders site-wide — purge all.
  globals: [withGlobalRevalidation(LeagueSettings, ALL_PAGES)],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
      // Serverless + Supabase transaction pooler (6543): keep each function
      // instance's pool small (the pooler multiplexes fan-in), release idle
      // connections quickly, and FAIL FAST on connect so a saturated pool
      // surfaces an error instead of hanging the request forever.
      max: Number(process.env.DB_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    },
    // Runtime uses Supabase's transaction pooler (6543); migrations run against
    // DATABASE_URI_DIRECT (5432) via the migrate scripts.
    migrationDir: path.resolve(dirname, 'migrations'),
    // Disable dev schema-push: it fires a flood of per-table introspection
    // queries on every boot (the "Pulling schema from database…" spinner) and,
    // against a remote pooler, exhausts connections + stalls startup. Schema
    // changes go through `npm run migrate:create` / `npm run migrate` instead.
    push: false,
  }),
  sharp,
  plugins,
})
