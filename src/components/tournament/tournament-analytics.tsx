'use client'

import * as React from 'react'
import { CaretDown, ChartBar } from '@phosphor-icons/react'

export type AnalyticsPanel = {
  id: string
  label: string
  caption: string
  node: React.ReactNode
}

/**
 * Tournament analysis with a tournament picker. Every panel is rendered on the
 * server and handed in as a node; this shell just swaps which one is visible so
 * you can drill from the all-tournaments overview into a single tournament (OG's
 * series + player breakdown) without a round-trip.
 */
export function TournamentAnalytics({ panels }: { panels: AnalyticsPanel[] }) {
  const [selected, setSelected] = React.useState(panels[0]?.id ?? '')
  const active = panels.find((p) => p.id === selected) ?? panels[0]

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="skeuo grid h-10 w-10 place-items-center rounded-xl text-primary">
            <ChartBar weight="bold" size={20} />
          </span>
          <div>
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">
              Tournament Analysis
            </h2>
            {active && <p className="text-sm text-muted-foreground">{active.caption}</p>}
          </div>
        </div>

        {panels.length > 1 && (
          <label className="relative">
            <span className="sr-only">Choose tournament</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="skeuo-btn appearance-none rounded-xl py-2 pl-4 pr-10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {panels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <CaretDown
              weight="bold"
              size={14}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </label>
        )}
      </div>

      {active?.node}
    </section>
  )
}
