'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { WinShareSlice } from '@/lib/home-stats'

const TOOLTIP = {
  background: 'rgba(10,10,14,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
  padding: '6px 10px',
} as const

/** Donut of total wins per owner, with the league win count in the hub. */
export function WinShareDonut({ slices, totalWins }: { slices: WinShareSlice[]; totalWins: number }) {
  return (
    <div className="relative mx-auto h-[200px] w-full max-w-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="owner"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((s) => (
              <Cell key={s.id} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP}
            itemStyle={{ color: '#fff', padding: 0 }}
            formatter={(v, n) => [`${v} wins`, n]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-black leading-none tabular-nums">{totalWins}</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Wins</span>
      </div>
    </div>
  )
}
