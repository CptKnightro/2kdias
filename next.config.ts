import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
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
