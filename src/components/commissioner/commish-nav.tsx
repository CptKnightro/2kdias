'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SquaresFour,
  Users as UsersIcon,
  IdentificationCard,
  Trophy,
  ArrowsLeftRight,
  GearSix,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/commissioner', label: 'Dashboard', icon: SquaresFour, exact: true },
  { href: '/commissioner/teams', label: 'Teams', icon: UsersIcon },
  { href: '/commissioner/players', label: 'Players', icon: IdentificationCard },
  { href: '/commissioner/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/commissioner/trades', label: 'Trades', icon: ArrowsLeftRight },
  { href: '/commissioner/settings', label: 'Settings', icon: GearSix },
]

export function CommishNav() {
  const pathname = usePathname()
  const active = (t: (typeof TABS)[number]) =>
    t.exact ? pathname === t.href : pathname.startsWith(t.href)

  return (
    <div className="glass mb-6 flex gap-1 overflow-x-auto rounded-2xl p-1.5">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
            active(t)
              ? 'skeuo-btn text-foreground'
              : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground',
          )}
        >
          <t.icon weight="bold" size={16} />
          {t.label}
        </Link>
      ))}
    </div>
  )
}
