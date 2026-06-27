import { Fragment } from 'react'
import { Sword } from '@phosphor-icons/react/dist/ssr'
import { ChartCard } from '@/components/home/chart-card'
import type { HeadToHead as H2HData } from '@/lib/home-stats'

/**
 * Owner-vs-owner record grid. Built as a CSS grid (not an auto-sizing table) so
 * every result cell is exactly the same size and shape regardless of name length.
 */
export function HeadToHead({ teams, matrix }: H2HData) {
  if (teams.length < 2) return null
  const n = teams.length

  return (
    <ChartCard title="Head to head" icon={Sword} hint="row vs column">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[20rem] items-center gap-1.5"
          style={{ gridTemplateColumns: `minmax(3rem, auto) repeat(${n}, minmax(2.5rem, 1fr))` }}
        >
          {/* Corner + column headers */}
          <div aria-hidden />
          {teams.map((t) => (
            <div
              key={`col-${t.id}`}
              className="flex flex-col items-center gap-1 pb-1 text-[11px] font-semibold text-muted-foreground"
            >
              <span className="size-2 rounded-full" style={{ background: t.color }} />
              <span className="max-w-full truncate">{t.owner}</span>
            </div>
          ))}

          {/* Rows */}
          {teams.map((row) => (
            <Fragment key={`row-${row.id}`}>
              <div className="flex items-center justify-end gap-1.5 pr-1 text-[11px] font-semibold">
                <span className="truncate">{row.owner}</span>
                <span className="size-2 shrink-0 rounded-full" style={{ background: row.color }} />
              </div>
              {teams.map((col) => {
                if (row.id === col.id)
                  return (
                    <div
                      key={col.id}
                      className="skeuo-inset grid h-11 place-items-center rounded-lg text-muted-foreground/40"
                    >
                      ·
                    </div>
                  )
                const rec = matrix[row.id]?.[col.id] ?? null
                const tone =
                  !rec || rec.w === rec.l
                    ? 'bg-foreground/5 text-muted-foreground'
                    : rec.w > rec.l
                      ? 'bg-success/15 text-success'
                      : 'bg-destructive/15 text-destructive'
                return (
                  <div
                    key={col.id}
                    className={`grid h-11 place-items-center rounded-lg text-sm font-bold tabular-nums ${tone}`}
                  >
                    {rec ? `${rec.w}-${rec.l}` : '—'}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}
