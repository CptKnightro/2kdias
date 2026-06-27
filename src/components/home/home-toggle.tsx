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
          className="skeuo-inset flex w-full max-w-md gap-1 rounded-full p-1 sm:inline-flex sm:w-auto sm:max-w-none"
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
                  'flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-xs font-bold uppercase tracking-wide transition-all sm:flex-none sm:px-5 sm:text-sm',
                  active
                    ? 'skeuo-btn text-foreground'
                    : 'text-foreground/55 hover:text-foreground',
                )}
              >
                <Icon weight="bold" size={16} className="shrink-0" />
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
