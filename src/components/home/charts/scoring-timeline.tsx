'use client'

import * as React from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Crown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { Timeline } from '@/lib/home-stats'

type Row = { dataKey?: string | number; value?: number; color?: string }

/**
 * Ranked, glassy tooltip. Sorts owners by cumulative points at the hovered game
 * (so rank 1 = who's actually leading), and shows each owner's increment for
 * *that* game (+X, only for whoever scored) next to their running total.
 */
function TimelineTooltip({
  active,
  payload,
  label,
  hidden,
  data,
  indexByLabel,
}: {
  active?: boolean
  payload?: Row[]
  label?: string
  hidden: Set<string>
  data: Timeline['data']
  indexByLabel: Map<string, number>
}) {
  if (!active || !payload?.length) return null
  const rows = payload
    .filter((p) => !hidden.has(String(p.dataKey)))
    .slice()
    // Cumulative value decides the ranking — highest total is first.
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  if (!rows.length) return null
  const [datePart, gamePart] = String(label ?? '').split(' · ')

  const idx = indexByLabel.get(String(label ?? ''))
  const deltaOf = (owner: string): number => {
    if (idx == null) return 0
    const curr = Number(data[idx]?.[owner] ?? 0)
    const prev = idx > 0 ? Number(data[idx - 1]?.[owner] ?? 0) : 0
    return curr - prev
  }

  return (
    <div className="min-w-[10.5rem] rounded-xl border border-white/10 bg-[rgba(10,10,14,0.96)] p-2.5 shadow-2xl backdrop-blur">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 border-b border-white/5 pb-1.5">
        <span className="text-[11px] font-black uppercase tracking-wide text-foreground">
          {datePart}
        </span>
        {gamePart && <span className="text-[10px] text-muted-foreground">{gamePart}</span>}
      </div>
      <ul className="space-y-1">
        {rows.map((p, i) => {
          const owner = String(p.dataKey)
          const delta = deltaOf(owner)
          return (
            <li key={owner} className="flex items-center gap-2 text-xs">
              {i === 0 ? (
                <Crown weight="fill" size={11} className="w-3 shrink-0 text-warning" />
              ) : (
                <span className="w-3 shrink-0 text-center text-[10px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
              )}
              <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} />
              <span
                className={cn('font-semibold', i === 0 ? 'text-foreground' : 'text-foreground/75')}
              >
                {owner}
              </span>
              <span className="ml-auto flex items-center gap-1.5 pl-2">
                {delta > 0 && (
                  <span className="rounded bg-success/15 px-1 py-px text-[10px] font-bold tabular-nums text-success">
                    +{delta}
                  </span>
                )}
                <span className="font-display font-black tabular-nums">{p.value}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Cumulative points per owner across the season — interactive.
 * Tap a name in the legend to hide/show its line; hover a name to isolate it
 * (others fade). The tooltip ranks everyone at the hovered game.
 */
export function ScoringTimeline({ series, data }: Timeline) {
  const [hidden, setHidden] = React.useState<Set<string>>(new Set())
  const [hover, setHover] = React.useState<string | null>(null)

  const toggle = (owner: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(owner)) next.delete(owner)
      else next.add(owner)
      return next
    })

  // De-duplicated date ticks — one per distinct day, downsampled to ~7 so the
  // axis reads cleanly instead of repeating "Jul 6" a dozen times.
  const ticks = React.useMemo(() => {
    const firsts: string[] = []
    for (let i = 0; i < data.length; i++) {
      if (i === 0 || data[i].date !== data[i - 1].date) firsts.push(data[i].label)
    }
    const MAX = 7
    const step = Math.max(1, Math.ceil(firsts.length / MAX))
    const picked = firsts.filter((_, i) => i % step === 0)
    const lastLabel = data[data.length - 1]?.label
    if (lastLabel && !picked.includes(lastLabel)) picked.push(lastLabel)
    return picked
  }, [data])

  // Fast lookup from a hovered point's label back to its row (for increments).
  const indexByLabel = React.useMemo(
    () => new Map(data.map((d, i) => [d.label, i])),
    [data],
  )

  const last = data[data.length - 1]
  const totals = series.map((s) => ({ ...s, total: Number(last?.[s.owner] ?? 0) }))
  const leader = totals.reduce<(typeof totals)[number] | null>(
    (best, t) => (!best || t.total > best.total ? t : best),
    null,
  )

  return (
    <div className="space-y-3">
      {/* Interactive legend — click to toggle, hover to isolate */}
      <div className="flex flex-wrap items-center gap-1.5">
        {totals.map((s) => {
          const isHidden = hidden.has(s.owner)
          const isLeader = leader?.id === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.owner)}
              onMouseEnter={() => setHover(s.owner)}
              onMouseLeave={() => setHover(null)}
              aria-pressed={!isHidden}
              className={cn(
                'group flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all skeuo-inset',
                isHidden ? 'opacity-45' : 'hover:bg-foreground/5',
                hover === s.owner && !isHidden && 'ring-1 ring-primary/50',
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full transition-transform group-hover:scale-125"
                style={{ background: s.color, filter: isHidden ? 'grayscale(1)' : undefined }}
              />
              <span className={cn(isHidden && 'line-through')}>{s.owner}</span>
              <span className="tabular-nums text-muted-foreground">{s.total}</span>
              {isLeader && !isHidden && <Crown weight="fill" size={11} className="text-warning" />}
            </button>
          )
        })}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 14, bottom: 4, left: -12 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            ticks={ticks}
            tickFormatter={(v) => String(v).split(' · ')[0]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#71717a', fontSize: 10 }}
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            tick={{ fill: '#71717a', fontSize: 10 }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1, strokeDasharray: '4 4' }}
            content={(p) => (
              <TimelineTooltip
                active={p.active}
                payload={p.payload as unknown as Row[]}
                label={p.label as string}
                hidden={hidden}
                data={data}
                indexByLabel={indexByLabel}
              />
            )}
          />
          {series.map((s) => {
            if (hidden.has(s.owner)) return null
            const active = hover === s.owner
            const faded = hover !== null && !active
            return (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.owner}
                stroke={s.color}
                strokeWidth={active ? 3.5 : 2}
                strokeOpacity={faded ? 0.15 : 1}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgba(0,0,0,0.45)' }}
                isAnimationActive={false}
                connectNulls
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>

      <p className="text-center text-[10px] text-muted-foreground">
        Tap a name to hide it · hover to isolate a line
      </p>
    </div>
  )
}
