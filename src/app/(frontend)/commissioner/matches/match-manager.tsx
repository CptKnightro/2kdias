'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Basketball, PencilSimple, Trash, CircleNotch, Check, X, FlagBanner } from '@phosphor-icons/react'
import { GlassPanel, EmptyState } from '@/components/ui-bits'
import { TeamLogo } from '@/components/team-logo'
import { NumberInput, MiniButton } from '@/components/commissioner/fields'
import { updateMatch, deleteMatch } from '@/app/(frontend)/matches/actions'
import type { Ring } from '@/lib/rings'
import { cn } from '@/lib/utils'

export type ManagedMatch = {
  id: number
  home: string
  away: string
  homeColor: string | null
  awayColor: string | null
  homeScore: number | null
  awayScore: number | null
  walkover: boolean
  ring: Ring
  status: string
  date: string
}

/**
 * League match results — commissioner-only fix-ups. Owners log matches from
 * the home page; correcting a score (or deleting a bogus entry) happens here.
 */
export function MatchManager({ matches }: { matches: ManagedMatch[] }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-xl font-black uppercase tracking-tight">Match Results</h2>
        <p className="text-sm text-muted-foreground">
          Fix a wrongly entered score or delete a match. Owners can only log new results.
        </p>
      </div>
      {matches.length === 0 ? (
        <EmptyState
          icon={Basketball}
          title="No matches logged"
          description="Results logged from the home page land here for corrections."
        />
      ) : (
        <GlassPanel className="divide-y divide-border/50 overflow-hidden p-0">
          {matches.map((m) => (
            <MatchRow key={m.id} match={m} />
          ))}
        </GlassPanel>
      )}
    </div>
  )
}

function MatchRow({ match: m }: { match: ManagedMatch }) {
  const router = useRouter()
  const [editing, setEditing] = React.useState(false)
  const [homeScore, setHomeScore] = React.useState(String(m.homeScore ?? ''))
  const [awayScore, setAwayScore] = React.useState(String(m.awayScore ?? ''))
  const [walkover, setWalkover] = React.useState(m.walkover)
  const [ring, setRing] = React.useState<Ring>(m.ring)
  const [pending, start] = React.useTransition()

  const homeWon = (m.homeScore ?? 0) > (m.awayScore ?? 0)
  const awayWon = (m.awayScore ?? 0) > (m.homeScore ?? 0)

  const cancel = () => {
    setEditing(false)
    setHomeScore(String(m.homeScore ?? ''))
    setAwayScore(String(m.awayScore ?? ''))
    setWalkover(m.walkover)
    setRing(m.ring)
  }

  const save = () => {
    if (homeScore === '' || awayScore === '') return toast.error('Enter both scores')
    start(async () => {
      const res = await updateMatch({ id: m.id, homeScore, awayScore, walkover, ring })
      if (res.ok) {
        toast.success('Match updated')
        setEditing(false)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Update failed')
      }
    })
  }

  const remove = () => {
    if (!confirm(`Delete ${m.home} vs ${m.away}? This can't be undone.`)) return
    start(async () => {
      const res = await deleteMatch(m.id)
      if (res.ok) {
        toast.success('Match deleted')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Delete failed')
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TeamLogo name={m.home} color={m.homeColor} size={20} />
        <span className={cn('truncate text-sm font-semibold', !homeWon && 'text-muted-foreground')}>
          {m.home}
        </span>
      </div>

      {editing ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <NumberInput
            min={0}
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            aria-label={`${m.home} score`}
            className="w-16 text-center font-bold tabular-nums"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <NumberInput
            min={0}
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            aria-label={`${m.away} score`}
            className="w-16 text-center font-bold tabular-nums"
          />
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2 font-display text-lg font-black tabular-nums">
          <span className={homeWon ? '' : 'text-muted-foreground'}>{m.homeScore ?? '–'}</span>
          <span className="text-xs text-muted-foreground">–</span>
          <span className={awayWon ? '' : 'text-muted-foreground'}>{m.awayScore ?? '–'}</span>
        </div>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={cn('truncate text-sm font-semibold', !awayWon && 'text-muted-foreground')}>
          {m.away}
        </span>
        <TeamLogo name={m.away} color={m.awayColor} size={20} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => setRing((r) => (r === '2k' ? 'goat' : '2k'))}
              title="Toggle which competition this match counts toward"
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                ring === '2k' ? 'bg-primary/20 text-primary' : 'bg-foreground/10 text-foreground/70',
              )}
            >
              {ring === '2k' ? '2K' : 'G.O.A.T'}
            </button>
            <button
              type="button"
              onClick={() => setWalkover((w) => !w)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                walkover ? 'bg-warning/20 text-warning' : 'bg-foreground/10 text-muted-foreground',
              )}
            >
              <FlagBanner weight="fill" size={10} /> Walkover
            </button>
            <MiniButton
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex items-center gap-1"
            >
              {pending ? (
                <CircleNotch weight="bold" className="size-4 animate-spin" />
              ) : (
                <Check weight="bold" className="size-4" />
              )}
              Save
            </MiniButton>
            <MiniButton
              type="button"
              onClick={cancel}
              disabled={pending}
              className="inline-flex items-center gap-1"
            >
              <X weight="bold" className="size-4" /> Cancel
            </MiniButton>
          </>
        ) : (
          <>
            <span
              className={cn(
                'hidden rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:inline',
                m.ring === '2k' ? 'bg-primary/15 text-primary' : 'bg-foreground/10 text-foreground/60',
              )}
            >
              {m.ring === '2k' ? '2K' : 'G.O.A.T'}
            </span>
            {m.walkover && (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
                Walkover
              </span>
            )}
            {m.date && (
              <span className="hidden text-xs text-muted-foreground sm:inline">{m.date}</span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={pending}
              aria-label={`Edit ${m.home} vs ${m.away}`}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-50"
            >
              <PencilSimple weight="bold" className="size-4" />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              aria-label={`Delete ${m.home} vs ${m.away}`}
              className="rounded-lg p-1.5 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              {pending ? (
                <CircleNotch weight="bold" className="size-4 animate-spin" />
              ) : (
                <Trash weight="bold" className="size-4" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
