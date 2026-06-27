'use client'

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PRIMARY } from '@/lib/home-stats'

export type BarDatum = { id: number; label: string; value: number; color: string | null }

const TOOLTIP = {
  background: 'rgba(10,10,14,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
  padding: '6px 10px',
} as const

/** Horizontal bar chart — one row per owner, colored by team. */
export function TeamBars({ data, unit }: { data: BarDatum[]; unit?: string }) {
  const height = Math.max(120, data.length * 38)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 12, bottom: 4, left: 4 }} barCategoryGap={8}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={70}
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={TOOLTIP}
          labelStyle={{ color: '#a1a1aa', marginBottom: 2 }}
          itemStyle={{ color: '#fff', padding: 0 }}
          formatter={(v) => [`${v}${unit ? ` ${unit}` : ''}`, '']}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.id} fill={d.color ?? PRIMARY} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
