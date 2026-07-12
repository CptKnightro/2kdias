import React from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter, Saira_Condensed } from 'next/font/google'
import './globals.css'
import { SiteNav } from '@/components/site-nav'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const saira = Saira_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-saira',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
// Sourced from package.json via next.config.ts — bump the version to update it.
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '2KDais — NBA 2K League',
    template: '%s — 2KDais',
  },
  description:
    'The home of our NBA 2K couch co-op league — live auction, trades & transfers, and tournaments.',
  applicationName: '2KDais',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: '2KDais — NBA 2K League',
    description: 'Live auction, trades & transfers, and tournaments.',
    siteName: '2KDais',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: '2KDais — NBA 2K League' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '2KDais — NBA 2K League',
    description: 'Live auction, trades & transfers, and tournaments.',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#050505',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${inter.variable} ${saira.variable}`}>
      {/* dvh (not vh) so mobile browser toolbars don't create phantom scroll past the footer */}
      <body className="flex min-h-dvh flex-col antialiased">
        <SiteNav />
        <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-10 2xl:px-14">
          {children}
        </main>
        <footer className="border-t border-border/40 py-4 text-center">
          <span className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground/50">
            2KDais · v{APP_VERSION}
          </span>
        </footer>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
