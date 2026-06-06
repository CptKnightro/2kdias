'use client'

import * as React from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { PlayerCard } from '@/components/player-card'
import type { CardPlayer } from '@/lib/players'
import { POSITIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function PlayersExplorer({ players }: { players: CardPlayer[] }) {
  const [q, setQ] = React.useState('')
  const [pos, setPos] = React.useState<string | null>(null)
  const [limit, setLimit] = React.useState(48)

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase()
    return players.filter((p) => {
      if (pos && p.position !== pos) return false
      if (needle && !`${p.name} ${p.nbaTeam ?? ''}`.toLowerCase().includes(needle)) return false
      return true
    })
  }, [players, q, pos])

  const shown = filtered.slice(0, limit)

  return (
    <div>
      {/* Filter bar */}
      <div className="glass mb-5 flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <div className="relative flex-1 basis-56">
          <MagnifyingGlass
            weight="bold"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search players…"
            className="skeuo-inset w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Chip active={!pos} onClick={() => setPos(null)}>
            All
          </Chip>
          {POSITIONS.map((p) => (
            <Chip key={p} active={pos === p} onClick={() => setPos(pos === p ? null : p)}>
              {p}
            </Chip>
          ))}
        </div>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        {filtered.length} player{filtered.length === 1 ? '' : 's'}
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {shown.map((p) => (
          <PlayerCard key={p.id} player={p} size="sm" />
        ))}
      </div>

      {limit < filtered.length && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setLimit((l) => l + 48)}
            className="skeuo rounded-xl px-5 py-2.5 text-sm font-semibold hover:text-primary"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
        active ? 'skeuo-btn' : 'skeuo text-foreground/70 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
