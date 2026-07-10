import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// App version — the single source of truth is package.json (kept in lockstep
// with package-lock.json). Exposed as an env var so the footer stamp on every
// page reflects exactly what's deployed. Bump the version → the stamp updates.
const require = createRequire(import.meta.url)
const { version: appVersion } = require('./package.json') as { version: string }

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  images: {
    localPatterns: [
      { pathname: '/api/media/file/**' },
      { pathname: '/**' }, // public assets: logo, icons, etc.
    ],
    remotePatterns: [
      // Supabase Storage (media uploads) — host is set once SUPABASE_URL is known.
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
  experimental: {
    // Repo lives on an ExFAT volume (/Volumes/CptKnightro), which doesn't
    // support the extended attributes macOS needs, so it writes AppleDouble
    // `._*` files into Turbopack's on-disk cache. Turbopack then fails to
    // parse one as part of its persistence DB ("invalid digit found in
    // string"). Disabling the dev filesystem cache avoids that DB entirely.
    turbopackFileSystemCacheForDev: false,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
