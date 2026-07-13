'use client'

import { Sword, Crown, Info, X } from '@phosphor-icons/react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { GlassPanel } from '@/components/ui-bits'
import { cn } from '@/lib/utils'

/** One game inside a series, oriented to the row's left/right duos. */
export type H2HGame = {
  a: number
  b: number
  winner: 'left' | 'right' | null
  walkover: boolean
}

/** A single best-of-N series (a whole tournament) between two fixed duos. */
export type H2HSeriesDetail = {
  leftWins: number
  rightWins: number
  winner: 'left' | 'right' | null
  live: boolean
  games: H2HGame[]
}

/**
 * A head-to-head matchup between two 2v2 duos. `leftScore`/`rightScore` are the
 * head-to-head result — the rivalry is won 1–0 by whoever took more series.
 * `leftSeries`/`rightSeries` are the underlying series tally (e.g. 3–1), surfaced
 * with the game-by-game breakdown in the info modal.
 */
export type H2HRow = {
  leftName: string
  rightName: string
  leftScore: number
  rightScore: number
  leftSeries: number
  rightSeries: number
  decided: boolean
  live: boolean
  winner: 'left' | 'right' | null
  seriesList: H2HSeriesDetail[]
}

/**
 * Head-to-head board for OG's rotating 2v2. The four owners pair up three ways;
 * each row is a head-to-head whose headline score is TOURNAMENTS won (1–0). The
 * ⓘ on each row opens the series detail (the 3–1 game breakdown).
 */
export function HeadToHeadBoard({ rows }: { rows: H2HRow[] }) {
  if (rows.length === 0) return null
  const playedCount = rows.filter((r) => r.decided).length

  return (
    <GlassPanel strong className="relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-primary/10 blur-3xl" />

      <div className="mb-5 flex items-center gap-2">
        <Sword weight="fill" size={16} className="text-primary" />
        <h3 className="font-display text-lg font-black uppercase tracking-tight">Head-to-head</h3>
        <span className="ml-auto text-[11px] uppercase tracking-wider text-muted-foreground">
          {playedCount}/3 · best of 5
        </span>
      </div>

      <div className="space-y-3">
        {rows.map((r, i) => (
          <MatchRow key={i} row={r} />
        ))}
      </div>
    </GlassPanel>
  )
}

/** One head-to-head fight card: duos flanking the tournament score, winner crowned. */
function MatchRow({ row }: { row: H2HRow }) {
  const leftWon = row.winner === 'left'
  const rightWon = row.winner === 'right'
  return (
    <div className="skeuo-inset relative overflow-hidden rounded-2xl px-4 py-4 sm:px-5">
      {/* winner-side glow */}
      {row.decided && (
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 w-1/2 bg-primary/10 blur-2xl',
            leftWon ? 'left-0' : 'right-0',
          )}
        />
      )}

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        {/* left duo */}
        <div className="flex min-w-0 items-center justify-end gap-1.5 text-right">
          {leftWon && <Crown weight="fill" size={13} className="shrink-0 text-primary" />}
          <span
            className={cn(
              'truncate font-display text-sm font-black uppercase leading-tight tracking-tight sm:text-base',
              leftWon ? 'text-primary' : rightWon ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {row.leftName}
          </span>
        </div>

        {/* head-to-head score + info trigger */}
        <div className="flex flex-col items-center px-1">
          <div className="flex items-baseline gap-1.5 font-display font-black leading-none tabular-nums">
            <span
              className={cn('text-3xl sm:text-4xl', leftWon ? 'text-primary' : 'text-muted-foreground')}
            >
              {row.leftScore}
            </span>
            <span className="text-lg text-muted-foreground/40 sm:text-xl">–</span>
            <span
              className={cn('text-3xl sm:text-4xl', rightWon ? 'text-primary' : 'text-muted-foreground')}
            >
              {row.rightScore}
            </span>
          </div>
          <H2HDetail row={row} />
        </div>

        {/* right duo */}
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              'truncate font-display text-sm font-black uppercase leading-tight tracking-tight sm:text-base',
              rightWon ? 'text-primary' : leftWon ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {row.rightName}
          </span>
          {rightWon && <Crown weight="fill" size={13} className="shrink-0 text-primary" />}
        </div>
      </div>
    </div>
  )
}

/** The ⓘ trigger (doubles as the score's caption) + the series-detail modal. */
function H2HDetail({ row }: { row: H2HRow }) {
  const label = row.decided ? 'head-to-head' : row.live ? 'in progress' : 'not played'
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`${row.leftName} vs ${row.rightName} — series detail`}
          className="mt-1.5 flex items-center gap-1 text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          {label}
          <Info weight="bold" size={12} className="opacity-80" />
        </button>
      </DialogTrigger>
      {/* Transparent shell — the inner .glass-strong carries the frosted look. */}
      <DialogContent
        showCloseButton={false}
        className="max-h-none overflow-y-visible border-0 !bg-transparent p-0 shadow-none sm:max-w-md"
      >
        <div className="glass-strong flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl">
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
            <DialogTitle className="font-display text-base font-black uppercase tracking-tight">
              Head-to-head
            </DialogTitle>
            <DialogClose
              aria-label="Close"
              className="rounded-lg p-1 text-foreground/60 transition-colors hover:text-foreground"
            >
              <X weight="bold" className="size-5" />
            </DialogClose>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
            <ModalBody row={row} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ModalBody({ row }: { row: H2HRow }) {
  const leftWon = row.winner === 'left'
  const rightWon = row.winner === 'right'
  return (
    <div className="space-y-4">
      {/* tournament tally (the head-to-head 1–0) */}
      <div className="skeuo-inset rounded-xl px-4 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span
            className={cn(
              'truncate text-right font-display text-sm font-black uppercase leading-tight',
              leftWon ? 'text-primary' : 'text-foreground',
            )}
          >
            {row.leftName}
          </span>
          <span className="shrink-0 font-display text-2xl font-black tabular-nums">
            <span className={leftWon ? 'text-primary' : 'text-muted-foreground'}>{row.leftSeries}</span>
            <span className="text-muted-foreground/40"> – </span>
            <span className={rightWon ? 'text-primary' : 'text-muted-foreground'}>{row.rightSeries}</span>
          </span>
          <span
            className={cn(
              'truncate font-display text-sm font-black uppercase leading-tight',
              rightWon ? 'text-primary' : 'text-foreground',
            )}
          >
            {row.rightName}
          </span>
        </div>
        <p className="mt-1.5 text-center text-[10px] uppercase tracking-widest text-muted-foreground/60">
          series won
        </p>
      </div>

      {/* series breakdown (the 3–1 and its games) */}
      {row.seriesList.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          These duos haven&apos;t faced off yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {row.seriesList.map((s, i) => {
            const sLeftWon = s.winner === 'left'
            const sRightWon = s.winner === 'right'
            return (
              <li key={i} className="skeuo-inset rounded-xl px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                    Series {row.seriesList.length > 1 ? i + 1 : ''}
                    {s.live ? ' · live' : ''}
                  </span>
                  <span className="font-display text-sm font-black tabular-nums">
                    <span className={sLeftWon ? 'text-primary' : 'text-foreground'}>{s.leftWins}</span>
                    <span className="text-muted-foreground/40">–</span>
                    <span className={sRightWon ? 'text-primary' : 'text-foreground'}>{s.rightWins}</span>
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.games.map((g, gi) => (
                    <span
                      key={gi}
                      className={cn(
                        'skeuo rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                        g.walkover ? 'text-warning' : 'text-muted-foreground',
                      )}
                    >
                      <span className={g.winner === 'left' ? 'font-black text-foreground' : ''}>
                        {g.a}
                      </span>
                      –
                      <span className={g.winner === 'right' ? 'font-black text-foreground' : ''}>
                        {g.b}
                      </span>
                      {g.walkover ? ' W/O' : ''}
                    </span>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
