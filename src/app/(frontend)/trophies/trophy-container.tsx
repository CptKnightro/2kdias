'use client'

import * as React from 'react'
import { Crown, Info, Medal, User, X } from '@phosphor-icons/react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { GlassPanel } from '@/components/ui-bits'
import { TeamLogo } from '@/components/team-logo'
import { trophyIcon } from '@/components/trophy-icon'

export type WinnerRow = {
  id: string
  /** 'team' shows logo + team + owner subtly; 'owner' shows just the person. */
  winnerKind: 'team' | 'owner'
  name: string
  owner: string | null
  color: string | null
  season: string | null
  awardedAt: string | null
}

/** Team rows get their logo; individual owners get a person mark instead. */
function WinnerMark({ winner, size }: { winner: { winnerKind: 'team' | 'owner'; name: string; color: string | null }; size: number }) {
  if (winner.winnerKind === 'owner') {
    return <User weight="fill" size={size * 0.75} className="shrink-0 text-foreground/50" />
  }
  return <TeamLogo name={winner.name} color={winner.color} size={size} />
}

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
export type TrophyCard = {
  id: string
  name: string
  kind: 'recurring' | 'final'
  icon: string | null
  description: string | null
  winners: WinnerRow[]
}

/** Collapse individual rings into one row per winner, most wins first. */
function aggregate(winners: WinnerRow[]) {
  const byWinner = new Map<
    string,
    {
      winnerKind: 'team' | 'owner'
      name: string
      owner: string | null
      color: string | null
      wins: number
    }
  >()
  for (const w of winners) {
    const key = `${w.winnerKind}:${w.name}`
    const row = byWinner.get(key)
    if (row) row.wins += 1
    else
      byWinner.set(key, {
        winnerKind: w.winnerKind,
        name: w.name,
        owner: w.owner,
        color: w.color,
        wins: 1,
      })
  }
  return [...byWinner.values()].sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name))
}

export function TrophyContainer({ trophy }: { trophy: TrophyCard }) {
  const isFinal = trophy.kind === 'final'
  const Icon = trophyIcon(trophy.icon, trophy.kind)
  const teams = aggregate(trophy.winners)

  return (
    <GlassPanel className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="skeuo grid h-11 w-11 shrink-0 place-items-center rounded-xl text-warning">
          <Icon weight="fill" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-xl font-black uppercase tracking-tight">
            {trophy.name}
          </h2>
          {trophy.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{trophy.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={
              isFinal
                ? 'rounded-full bg-warning/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-warning'
                : 'rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary'
            }
          >
            {isFinal ? 'Final' : 'Recurring'}
          </span>
          {!isFinal && trophy.winners.length > 0 && <RingHistory trophy={trophy} />}
        </div>
      </div>

      <div className="mt-4">
        {isFinal ? (
          trophy.winners.length ? (
            <div className="skeuo-inset flex items-center gap-3 rounded-xl p-4">
              <Crown weight="fill" size={28} className="shrink-0 text-warning" />
              <WinnerMark winner={trophy.winners[0]} size={36} />
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-black uppercase leading-tight tracking-tight">
                  {trophy.winners[0].name}
                </p>
                {(trophy.winners[0].owner ||
                  trophy.winners[0].season ||
                  trophy.winners[0].awardedAt) && (
                  <p className="truncate text-xs text-muted-foreground">
                    {[
                      trophy.winners[0].owner,
                      trophy.winners[0].season,
                      fmtDate(trophy.winners[0].awardedAt),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="skeuo-inset rounded-xl p-4 text-center text-sm text-muted-foreground">
              Not yet awarded.
            </p>
          )
        ) : teams.length ? (
          <ul className="space-y-1.5">
            {teams.map((t) => (
              <li key={t.name} className="skeuo-inset flex items-center gap-3 rounded-xl px-3 py-2.5">
                <Medal weight="fill" size={18} className="shrink-0 text-warning" />
                <WinnerMark winner={t} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold leading-tight">
                    {t.name}
                  </span>
                  {t.owner && (
                    <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                      {t.owner}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-baseline gap-1">
                  <span className="font-display text-xl font-black leading-none">{t.wins}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t.wins === 1 ? 'win' : 'wins'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="skeuo-inset rounded-xl p-4 text-center text-sm text-muted-foreground">
            No rings handed out yet.
          </p>
        )}
        {!isFinal && trophy.winners.length > 0 && (
          <p className="mt-2 text-right text-xs text-muted-foreground">
            {trophy.winners.length} ring{trophy.winners.length === 1 ? '' : 's'} total
          </p>
        )}
      </div>
    </GlassPanel>
  )
}

/** ⓘ — opens the ring-by-ring history for a recurring trophy. */
function RingHistory({ trophy }: { trophy: TrophyCard }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`${trophy.name} — ring history`}
          className="skeuo grid h-7 w-7 place-items-center rounded-full text-foreground/70 transition-colors hover:text-foreground"
        >
          <Info weight="bold" size={15} />
        </button>
      </DialogTrigger>
      {/* Transparent shell — the inner .glass-strong panel carries the frosted look,
          since `bg-*` utilities would otherwise override the component-layer glass. */}
      <DialogContent
        showCloseButton={false}
        className="max-h-none overflow-y-visible border-0 !bg-transparent p-0 shadow-none sm:max-w-md"
      >
        <div className="glass-strong flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl">
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
            <DialogTitle className="font-display text-lg font-black uppercase tracking-tight">
              {trophy.name} — history
            </DialogTitle>
            <DialogClose
              aria-label="Close"
              className="rounded-lg p-1 text-foreground/60 transition-colors hover:text-foreground"
            >
              <X weight="bold" className="size-5" />
            </DialogClose>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
            <ul className="space-y-1.5">
              {trophy.winners.map((w, i) => (
                <li key={w.id} className="skeuo-inset flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <span className="w-6 shrink-0 text-right font-display text-sm font-black text-muted-foreground">
                    {i + 1}
                  </span>
                  <Medal weight="fill" size={16} className="shrink-0 text-warning" />
                  <WinnerMark winner={w} size={20} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold leading-tight">
                      {w.name}
                    </span>
                    {w.owner && (
                      <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                        {w.owner}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted-foreground">
                    {[w.season, fmtDate(w.awardedAt)].filter(Boolean).join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
