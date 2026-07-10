'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash, CircleNotch, FlagBanner } from '@phosphor-icons/react'
import { GlassPanel, EmptyState } from '@/components/ui-bits'
import { TeamLogo } from '@/components/team-logo'
import {
  Field,
  Select,
  NumberInput,
  TextInput,
  SubmitButton,
  MiniButton,
  type Option,
} from '@/components/commissioner/fields'
import { cn } from '@/lib/utils'
import { logTournamentGame, deleteTournamentGame } from '../actions'
import { isCommissionerViewer } from '@/app/(frontend)/matches/actions'

export type DetailParticipant = { id: string; owner: string; color: string }
export type DetailGame = {
  id: string
  format: '1v1' | '2v2'
  a: { owners: string[]; team: string | null }
  b: { owners: string[]; team: string | null }
  scoreA: number | null
  scoreB: number | null
  walkover: boolean
}

export function TournamentDetail({
  tournamentId,
  participants,
  games,
}: {
  tournamentId: number
  participants: DetailParticipant[]
  games: DetailGame[]
}) {
  const [canDelete, setCanDelete] = React.useState(false)

  React.useEffect(() => {
    let active = true
    isCommissionerViewer().then((v) => active && setCanDelete(v))
    return () => {
      active = false
    }
  }, [])

  const byId = React.useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants])

  return (
    <div className="space-y-6">
      <LogGameForm tournamentId={tournamentId} participants={participants} />

      <div>
        <h2 className="mb-3 font-display text-xl font-black uppercase tracking-tight">
          Games <span className="text-muted-foreground">({games.length})</span>
        </h2>
        {games.length === 0 ? (
          <EmptyState
            icon={FlagBanner}
            title="No games logged"
            description="Use the form above to log the first game of this tournament — 1v1 or 2v2."
          />
        ) : (
          <div className="space-y-2">
            {games.map((g) => (
              <GameRow
                key={g.id}
                game={g}
                byId={byId}
                tournamentId={tournamentId}
                canDelete={canDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ownerNames(ids: string[], byId: Map<string, DetailParticipant>): string {
  return ids.map((id) => byId.get(id)?.owner ?? '—').join(' & ')
}

function GameRow({
  game: g,
  byId,
  tournamentId,
  canDelete,
}: {
  game: DetailGame
  byId: Map<string, DetailParticipant>
  tournamentId: number
  canDelete: boolean
}) {
  const router = useRouter()
  const [pending, start] = React.useTransition()

  // A walkover still has a winner by score — it's just a tag on the result.
  const aWin = (g.scoreA ?? 0) > (g.scoreB ?? 0)
  const bWin = (g.scoreB ?? 0) > (g.scoreA ?? 0)

  const remove = () => {
    if (!confirm('Delete this game?')) return
    start(async () => {
      const res = await deleteTournamentGame(tournamentId, g.id)
      if (res.ok) {
        toast.success('Game deleted')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Delete failed')
      }
    })
  }

  return (
    <GlassPanel className="p-4">
      <div className="flex items-center gap-3">
        <span className="hidden shrink-0 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:inline">
          {g.format}
        </span>
        <Side names={ownerNames(g.a.owners, byId)} team={g.a.team} win={aWin} align="right" />
        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="skeuo-inset rounded-lg px-3 py-1 font-display text-lg font-black tabular-nums">
            {g.scoreA ?? 0} – {g.scoreB ?? 0}
          </span>
          {g.walkover && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning">
              <FlagBanner weight="fill" size={9} /> Walkover
            </span>
          )}
        </div>
        <Side names={ownerNames(g.b.owners, byId)} team={g.b.team} win={bWin} align="left" />
        {canDelete && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="Delete game"
            className="ml-1 shrink-0 rounded-lg p-1.5 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            {pending ? (
              <CircleNotch weight="bold" className="size-4 animate-spin" />
            ) : (
              <Trash weight="bold" className="size-4" />
            )}
          </button>
        )}
      </div>
    </GlassPanel>
  )
}

function Side({
  names,
  team,
  win,
  align,
}: {
  names: string
  team: string | null
  win: boolean
  align: 'left' | 'right'
}) {
  return (
    <div className={cn('min-w-0 flex-1', align === 'right' ? 'text-right' : 'text-left')}>
      <p className={cn('truncate font-semibold', win ? 'text-primary' : '')}>{names}</p>
      {team && (
        <p
          className={cn(
            'flex items-center gap-1.5 text-xs text-muted-foreground',
            align === 'right' && 'justify-end',
          )}
        >
          {align === 'left' && <TeamLogo name={team} size={14} />}
          <span className="truncate">{team}</span>
          {align === 'right' && <TeamLogo name={team} size={14} />}
        </p>
      )}
    </div>
  )
}

function LogGameForm({
  tournamentId,
  participants,
}: {
  tournamentId: number
  participants: DetailParticipant[]
}) {
  const router = useRouter()
  const [format, setFormat] = React.useState<'1v1' | '2v2'>('1v1')
  const [a1, setA1] = React.useState('')
  const [a2, setA2] = React.useState('')
  const [b1, setB1] = React.useState('')
  const [b2, setB2] = React.useState('')
  const [aTeam, setATeam] = React.useState('')
  const [bTeam, setBTeam] = React.useState('')
  const [scoreA, setScoreA] = React.useState('')
  const [scoreB, setScoreB] = React.useState('')
  const [walkover, setWalkover] = React.useState(false)
  const [pending, start] = React.useTransition()

  const opt = (p: DetailParticipant): Option => ({ label: p.owner, value: p.id })
  // Each dropdown excludes owners already chosen in the other slots.
  const taken = (...vals: string[]) => new Set(vals.filter(Boolean))
  const optionsExcluding = (...exclude: string[]) => {
    const ex = taken(...exclude)
    return participants.filter((p) => !ex.has(p.id)).map(opt)
  }

  const reset = () => {
    setA1('')
    setA2('')
    setB1('')
    setB2('')
    setATeam('')
    setBTeam('')
    setScoreA('')
    setScoreB('')
    setWalkover(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const aOwners = format === '2v2' ? [a1, a2] : [a1]
    const bOwners = format === '2v2' ? [b1, b2] : [b1]
    if (aOwners.some((x) => !x) || bOwners.some((x) => !x))
      return toast.error(format === '2v2' ? 'Pick two owners per side' : 'Pick an owner per side')
    if (scoreA === '' || scoreB === '') return toast.error('Enter both scores')
    start(async () => {
      const res = await logTournamentGame({
        tournamentId,
        format,
        aOwners,
        bOwners,
        aTeam,
        bTeam,
        scoreA,
        scoreB,
        walkover,
      })
      if (res.ok) {
        toast.success('Game logged')
        reset()
        router.refresh()
      } else {
        toast.error(res.error ?? 'Something went wrong')
      }
    })
  }

  if (participants.length < 2) {
    return (
      <GlassPanel className="p-5 text-sm text-muted-foreground">
        Add at least two participants to this tournament (in the commissioner panel) to start
        logging games.
      </GlassPanel>
    )
  }

  return (
    <GlassPanel strong className="p-5 sm:p-6">
      <form onSubmit={submit} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-black uppercase tracking-tight">Log a game</h2>
          {/* format segmented control */}
          <div className="skeuo-inset inline-flex gap-1 rounded-full p-1">
            {(['1v1', '2v2'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition-all',
                  format === f
                    ? 'skeuo-btn text-foreground'
                    : 'text-foreground/55 hover:text-foreground',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid items-start gap-4 sm:grid-cols-[1fr_auto_1fr]">
          {/* Side A */}
          <div className="space-y-3">
            <Field label={format === '2v2' ? 'Side A — owners' : 'Side A — owner'}>
              <Select
                value={a1}
                onChange={(e) => setA1(e.target.value)}
                options={optionsExcluding(a2, b1, b2)}
                placeholder="— owner —"
              />
            </Field>
            {format === '2v2' && (
              <Select
                value={a2}
                onChange={(e) => setA2(e.target.value)}
                options={optionsExcluding(a1, b1, b2)}
                placeholder="— partner —"
              />
            )}
            <Field label="Playing as">
              <TextInput
                value={aTeam}
                onChange={(e) => setATeam(e.target.value)}
                placeholder="NBA team"
              />
            </Field>
            <Field label="Score">
              <NumberInput
                min={0}
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value)}
                placeholder="0"
                className="text-center text-lg font-bold tabular-nums"
              />
            </Field>
          </div>

          <div className="flex items-center justify-center pt-8 font-display text-2xl font-black text-muted-foreground sm:pt-10">
            vs
          </div>

          {/* Side B */}
          <div className="space-y-3">
            <Field label={format === '2v2' ? 'Side B — owners' : 'Side B — owner'}>
              <Select
                value={b1}
                onChange={(e) => setB1(e.target.value)}
                options={optionsExcluding(a1, a2, b2)}
                placeholder="— owner —"
              />
            </Field>
            {format === '2v2' && (
              <Select
                value={b2}
                onChange={(e) => setB2(e.target.value)}
                options={optionsExcluding(a1, a2, b1)}
                placeholder="— partner —"
              />
            )}
            <Field label="Playing as">
              <TextInput
                value={bTeam}
                onChange={(e) => setBTeam(e.target.value)}
                placeholder="NBA team"
              />
            </Field>
            <Field label="Score">
              <NumberInput
                min={0}
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value)}
                placeholder="0"
                className="text-center text-lg font-bold tabular-nums"
              />
            </Field>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={walkover}
            onChange={(e) => setWalkover(e.target.checked)}
            className="size-4 accent-primary"
          />
          <FlagBanner
            weight="fill"
            className={cn('size-4', walkover ? 'text-primary' : 'text-muted-foreground')}
          />
          Walkover — the loser earns a Walk of Shame mark
        </label>

        <div className="flex items-center gap-2">
          <SubmitButton type="submit" pending={pending}>
            <Plus weight="bold" className="size-4" /> Log game
          </SubmitButton>
          <MiniButton type="button" onClick={reset}>
            Clear
          </MiniButton>
        </div>
      </form>
    </GlassPanel>
  )
}
