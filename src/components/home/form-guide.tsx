import { Pulse } from '@phosphor-icons/react/dist/ssr'
import { ChartCard } from '@/components/home/chart-card'
import type { FormRow } from '@/lib/home-stats'

/** Each owner's last-5 results as W/L dots (oldest → newest). Walkovers get a ring. */
export function FormGuide({ rows }: { rows: FormRow[] }) {
  if (rows.length === 0) return null

  return (
    <ChartCard title="Form guide" icon={Pulse} hint="last 5 · old → new">
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3">
            <span className="flex w-20 shrink-0 items-center gap-1.5 truncate text-xs font-semibold text-foreground/80">
              <span className="size-2 shrink-0 rounded-full" style={{ background: row.color }} />
              {row.owner}
            </span>
            <span className="flex items-center gap-1.5">
              {row.results.map((r, i) => (
                <span
                  key={i}
                  title={r.walkover ? `${r.result} (walkover)` : r.result}
                  className={`grid size-6 place-items-center rounded-md text-[11px] font-black ${
                    r.result === 'W'
                      ? 'bg-success/20 text-success'
                      : 'bg-destructive/20 text-destructive'
                  } ${r.walkover ? 'ring-1 ring-inset ring-foreground/40' : ''}`}
                >
                  {r.result}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </ChartCard>
  )
}
