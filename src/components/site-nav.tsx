'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  House,
  Gavel,
  Users as UsersIcon,
  IdentificationCard,
  ArrowsLeftRight,
  Trophy,
  ListNumbers,
  Medal,
  List,
  X,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './theme-toggle'

const NAV = [
  { href: '/', label: 'Home', icon: House },
  { href: '/auction', label: 'Auction', icon: Gavel },
  { href: '/teams', label: 'Teams', icon: UsersIcon },
  { href: '/players', label: 'Players', icon: IdentificationCard },
  { href: '/trades', label: 'Trades', icon: ArrowsLeftRight },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/standings', label: 'Standings', icon: ListNumbers },
  { href: '/records', label: 'Records', icon: Medal },
]

export function SiteNav() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-50 px-3 pt-3">
      <nav className="glass mx-auto flex max-w-7xl items-center gap-2 rounded-2xl px-3 py-2">
        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center gap-2 pr-2">
          <Image
            src="/logo-full.png"
            alt="2KDais"
            width={1606}
            height={592}
            priority
            className="h-7 w-auto drop-shadow-[0_2px_6px_rgba(223,38,4,0.35)]"
          />
        </Link>

        {/* Desktop links */}
        <ul className="ml-1 hidden flex-1 items-center gap-1 lg:flex">
          {NAV.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'group flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                  isActive(href)
                    ? 'skeuo-btn'
                    : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground',
                )}
              >
                <Icon weight="bold" size={16} />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/admin"
            className="skeuo hidden rounded-xl px-3 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-primary sm:block"
          >
            Commissioner
          </Link>
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="skeuo grid h-9 w-9 place-items-center rounded-full lg:hidden"
          >
            {open ? <X weight="bold" size={18} /> : <List weight="bold" size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="glass-strong mx-auto mt-2 max-w-7xl rounded-2xl p-2 lg:hidden">
          <ul className="grid grid-cols-2 gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium',
                    isActive(href) ? 'skeuo-btn' : 'hover:bg-foreground/5',
                  )}
                >
                  <Icon weight="bold" size={18} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}
