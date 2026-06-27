'use client'

import * as React from 'react'
import { SquaresFour, Pulse, Basketball } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

type View = 'dashboard' | 'status' | 'log'

const TABS: { key: View; label: string; icon: typeof SquaresFour }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: SquaresFour },
  { key: 'status', label: 'Status', icon: Pulse },
  { key: 'log', label: 'Log Match', icon: Basketball },
]

/**
 * Client toggle that swaps between two server-rendered views. Both views are
 * passed in as already-rendered nodes (data baked in on the server), so the
 * switch is instant — no refetch, no extra request.
 */
export function HomeToggle({
  dashboard,
  status,
  log,
}: {
  dashboard: React.ReactNode
  status: React.ReactNode
  log: React.ReactNode
}) {
  const [view, setView] = React.useState<View>('dashboard')

  const views: Record<View, React.ReactNode> = { dashboard, status, log }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Home view"
          className="skeuo-inset inline-flex gap-1 rounded-full p-1"
        >
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = view === key
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => setView(key)}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wide transition-all',
                  active
                    ? 'skeuo-btn text-foreground'
                    : 'text-foreground/55 hover:text-foreground',
                )}
              >
                <Icon weight="bold" size={16} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div>{views[view]}</div>
    </div>
  )
}
