'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Timeline } from '@/lib/home-stats'

const TOOLTIP = {
  background: 'rgba(10,10,14,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
  padding: '8px 10px',
} as const

/** Cumulative points scored per owner across the season. */
export function ScoringTimeline({ series, data }: Timeline) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#71717a', fontSize: 10 }}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tick={{ fill: '#71717a', fontSize: 10 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={TOOLTIP}
          labelStyle={{ color: '#a1a1aa', marginBottom: 4 }}
          itemStyle={{ padding: 0 }}
        />
        {series.map((s) => (
          <Line
            key={s.id}
            type="monotone"
            dataKey={s.owner}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
