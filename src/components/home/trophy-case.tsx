import Link from 'next/link'
import { CaretRight, Trophy } from '@phosphor-icons/react/dist/ssr'

export type TrophyCaseRow = { label: string; color: string | null; rings: number }

const MAX_GLYPHS = 8

/** Rings & silverware per owner — one row each, a trophy glyph per ring. */
export function TrophyCase({ rows }: { rows: TrophyCaseRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="grid place-items-center gap-2 py-6 text-center">
        <Trophy weight="fill" size={28} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No rings handed out yet.</p>
        <Link
          href="/trophies"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Visit the trophy room <CaretRight weight="bold" size={14} />
        </Link>
      </div>
    )
  }

  return (
    <div>
      <ul className="space-y-2.5 py-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3">
            <span className="flex w-[70px] shrink-0 items-center justify-end gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: r.color ?? 'var(--color-muted-foreground)' }}
              />
              <span className="truncate text-xs font-semibold text-muted-foreground">
                {r.label}
              </span>
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1">
              {Array.from({ length: Math.min(r.rings, MAX_GLYPHS) }).map((_, i) => (
                <Trophy key={i} weight="fill" size={17} className="shrink-0 text-warning" />
              ))}
              {r.rings > MAX_GLYPHS && (
                <span className="text-xs font-bold text-muted-foreground">
                  +{r.rings - MAX_GLYPHS}
                </span>
              )}
            </span>
            <span className="font-display text-xl font-black leading-none">{r.rings}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-end">
        <Link
          href="/trophies"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          View all trophies <CaretRight weight="bold" size={12} />
        </Link>
      </div>
    </div>
  )
}
