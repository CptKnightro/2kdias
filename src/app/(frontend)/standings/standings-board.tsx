'use client'

import * as React from 'react'
import { Crown } from '@phosphor-icons/react'
import { GlassPanel } from '@/components/ui-bits'
import { cn } from '@/lib/utils'

export type StandingRow = {
  id: string
  team: string
  owner: string | null
  color: string
  w: number
  l: number
  pf: number
  pa: number
}

type View = 'seed' | 'points'

const MEDAL: Record<number, string> = {
  1: '#FFD24A', // gold
  2: '#C9D1D9', // silver
  3: '#E08A4B', // bronze
}

export function StandingsBoard({ rows }: { rows: StandingRow[] }) {
  const [view, setView] = React.useState<View>('seed')

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Standings view"
          className="skeuo-inset inline-flex gap-1 rounded-full p-1"
        >
          {(
            [
              { key: 'seed', label: 'Seed' },
              { key: 'points', label: 'Points' },
            ] as { key: View; label: string }[]
          ).map(({ key, label }) => {
            const active = view === key
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => setView(key)}
                className={cn(
                  'cursor-pointer rounded-full px-6 py-2 text-sm font-bold uppercase tracking-wide transition-all',
                  active ? 'skeuo-btn text-foreground' : 'text-foreground/55 hover:text-foreground',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {view === 'seed' ? <SeedView rows={rows} /> : <PointsTable rows={rows} />}
    </div>
  )
}

function SeedView({ rows }: { rows: StandingRow[] }) {
  return (
    <ol className="space-y-2.5">
      {rows.map((r, i) => {
        const rank = i + 1
        const medal = MEDAL[rank]
        return (
          <li
            key={r.id}
            className={cn(
              'skeuo flex items-center gap-4 rounded-2xl p-4',
              rank === 1 && 'ring-1 ring-primary/30',
            )}
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-xl font-display text-lg font-black tabular-nums"
              style={
                medal
                  ? { background: `${medal}1f`, color: medal }
                  : { background: 'var(--muted)', color: 'var(--muted-foreground)' }
              }
            >
              {rank}
            </span>
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ background: r.color }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-black uppercase leading-tight tracking-tight">
                {r.owner ?? r.team}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {r.owner ? r.team : 'Owner not assigned'}
              </p>
            </div>
            {rank === 1 && <Crown weight="fill" className="size-5 shrink-0 text-primary" />}
          </li>
        )
      })}
    </ol>
  )
}

function PointsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <GlassPanel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">#</th>
              <th className="px-2 py-3">Team</th>
              <th className="px-2 py-3 text-center">W</th>
              <th className="px-2 py-3 text-center">L</th>
              <th className="px-2 py-3 text-center">PF</th>
              <th className="px-2 py-3 text-center">PA</th>
              <th className="px-4 py-3 text-center">Diff</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const diff = r.pf - r.pa
              return (
                <tr
                  key={r.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-foreground/5',
                    i === 0 && 'bg-primary/5',
                  )}
                >
                  <td className="px-4 py-3 font-display font-bold text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-3">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                      {r.team}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center font-bold text-success">{r.w}</td>
                  <td className="px-2 py-3 text-center text-muted-foreground">{r.l}</td>
                  <td className="px-2 py-3 text-center">{r.pf}</td>
                  <td className="px-2 py-3 text-center">{r.pa}</td>
                  <td
                    className={cn(
                      'px-4 py-3 text-center font-display font-bold',
                      diff > 0 ? 'text-success' : diff < 0 ? 'text-primary' : '',
                    )}
                  >
                    {diff > 0 ? '+' : ''}
                    {diff}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  )
}
