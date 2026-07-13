'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { GoatIcon, TwoKLogo } from '@/components/ring-icon'
import { RING_SHORT, type Ring } from '@/lib/rings'

function RingGlyph({ ring, active, size }: { ring: Ring; active: boolean; size: number }) {
  if (ring === 'goat') return <GoatIcon size={size} />
  // The 2K mark is a colored image, not a currentColor glyph — dim it to
  // match the inactive text instead.
  return <TwoKLogo size={size} className={cn(!active && 'opacity-50 grayscale')} />
}

/**
 * Segmented G.O.A.T / 2K Championship control — shared by the dashboard hero
 * and the Log Match form. Controlled, so each host owns which ring is live.
 */
export function RingTabs({
  value,
  onChange,
  size = 'md',
  className,
}: {
  value: Ring
  onChange: (r: Ring) => void
  size?: 'md' | 'lg'
  className?: string
}) {
  const lg = size === 'lg'
  return (
    <div
      role="tablist"
      aria-label="Competition"
      className={cn(
        'skeuo-inset flex gap-1 rounded-full p-1',
        lg ? 'w-full max-w-lg sm:inline-flex sm:w-auto sm:max-w-none' : 'w-full',
        className,
      )}
    >
      {(['goat', '2k'] as Ring[]).map((ring) => {
        const active = value === ring
        return (
          <button
            key={ring}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(ring)}
            className={cn(
              'flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold uppercase tracking-wide transition-all',
              lg
                ? 'px-3 py-3 font-display text-base font-black sm:flex-none sm:px-8 sm:text-xl'
                : 'px-2.5 py-2 text-xs sm:text-sm',
              active ? 'skeuo-btn text-foreground' : 'text-foreground/55 hover:text-foreground',
            )}
          >
            <RingGlyph ring={ring} active={active} size={lg ? 26 : 16} />
            {RING_SHORT[ring]}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Client swap between the two server-rendered dashboards — replaces the old
 * season hero. Both rings' views are baked in on the server (same trick as
 * HomeToggle), so switching is instant with no refetch.
 */
export function RingToggle({ goat, twoK }: { goat: React.ReactNode; twoK: React.ReactNode }) {
  const [ring, setRing] = React.useState<Ring>('goat')

  return (
    <div className="space-y-6">
      {/* Ring picker — centered hero where the season card used to sit */}
      <div className="relative flex justify-center pt-1">
        <div className="pointer-events-none absolute -top-10 left-1/2 h-28 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <RingTabs value={ring} onChange={setRing} size="lg" className="relative" />
      </div>

      <div>{ring === 'goat' ? goat : twoK}</div>
    </div>
  )
}
