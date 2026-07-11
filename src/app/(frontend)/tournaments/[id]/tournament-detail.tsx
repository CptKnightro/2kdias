'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash, CircleNotch, FlagBanner, Crown, Trophy } from '@phosphor-icons/react'
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
import { buildSeries, type Series, type SideGame } from '@/lib/tournament-stats'
import type { FranchiseRow } from '@/lib/home-stats'

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

const BEST_OF = 5
const WINS_NEEDED = Math.floor(BEST_OF / 2) + 1

/* ── helpers ──────────────────────────────────────────────────────────────── */

const sideKey = (ids: (string | number)[]) => ids.map(Number).sort((a, b) => a - b).join('-')
const matchKey = (a: (string | number)[], b: (string | number)[]) =>
  [sideKey(a), sideKey(b)].sort().join('|')

function toSideGames(games: DetailGame[]): SideGame[] {
  return games.map((g) => ({
    a: g.a.owners.map(Number),
    b: g.b.owners.map(Number),
    scoreA: g.scoreA,
    scoreB: g.scoreB,
    walkover: g.walkover,
  }))
}

type Matchup = {
  key: string
  a: DetailParticipant[]
  b: DetailParticipant[]
  aIds: string[]
  bIds: string[]
  aLabel: string
  bLabel: string
  aColor: string
  bColor: string
}

/** The 3 ways to split 4 players into two pairs — the OG rotation. */
function buildMatchups(ps: DetailParticipant[]): Matchup[] {
  if (ps.length !== 4) return []
  const [p0, p1, p2, p3] = ps
  const raw: [DetailParticipant[], DetailParticipant[]][] = [
    [[p0, p1], [p2, p3]],
    [[p0, p2], [p1, p3]],
    [[p0, p3], [p1, p2]],
  ]
  return raw.map(([a, b]) => {
    // Orient the smaller sideKey as A so a matchup always reads the same way.
    const ka = sideKey(a.map((x) => x.id))
    const kb = sideKey(b.map((x) => x.id))
    const [A, B] = ka <= kb ? [a, b] : [b, a]
    return {
      key: [ka, kb].sort().join('|'),
      a: A,
      b: B,
      aIds: A.map((x) => x.id),
      bIds: B.map((x) => x.id),
      aLabel: A.map((x) => x.owner).join(' & '),
      bLabel: B.map((x) => x.owner).join(' & '),
      aColor: A[0].color,
      bColor: B[0].color,
    }
  })
}

/* ── entry ────────────────────────────────────────────────────────────────── */

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

  // OG format: exactly 4 owners rotating 2v2 through best-of-5 series.
  const isOG = participants.length === 4

  const series = React.useMemo<Series[]>(() => {
    if (!isOG) return []
    const franchises: FranchiseRow[] = participants.map((p) => ({
      id: Number(p.id),
      name: p.owner,
      owner: p.owner,
      color: p.color,
    }))
    return buildSeries(franchises, toSideGames(games), BEST_OF)
  }, [isOG, participants, games])

  if (isOG) {
    return (
      <div className="space-y-6">
        <SeriesLogger tournamentId={tournamentId} participants={participants} series={series} />
        <SeriesBoard
          series={series}
          games={games}
          tournamentId={tournamentId}
          canDelete={canDelete}
        />
      </div>
    )
  }

  // Generic tournaments (1v1 / non-4-player) keep the classic form + flat list.
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

/* ── OG: series logger ────────────────────────────────────────────────────── */

function SeriesLogger({
  tournamentId,
  participants,
  series,
}: {
  tournamentId: number
  participants: DetailParticipant[]
  series: Series[]
}) {
  const router = useRouter()
  const matchups = React.useMemo(() => buildMatchups(participants), [participants])

  // The live series (if any) — used to preselect the matchup that's mid-flight.
  const liveKey = React.useMemo(() => {
    let live: Series | undefined
    for (const s of series) if (s.live) live = s
    return live ? matchKey(live.aIds, live.bIds) : null
  }, [series])

  const [pick, setPick] = React.useState(
    () => matchups.find((m) => m.key === liveKey)?.key ?? matchups[0]?.key ?? '',
  )
  // Follow the live series as games come in (unless the user picked another).
  const touched = React.useRef(false)
  React.useEffect(() => {
    if (!touched.current && liveKey) setPick(liveKey)
  }, [liveKey])

  const selected = matchups.find((m) => m.key === pick) ?? matchups[0]
  const liveSeries = series.find((s) => s.live && matchKey(s.aIds, s.bIds) === selected?.key)

  const [aTeam, setATeam] = React.useState('')
  const [bTeam, setBTeam] = React.useState('')
  const [scoreA, setScoreA] = React.useState('')
  const [scoreB, setScoreB] = React.useState('')
  const [walkover, setWalkover] = React.useState(false)
  const [pending, start] = React.useTransition()

  if (!selected) return null

  const reset = () => {
    setATeam('')
    setBTeam('')
    setScoreA('')
    setScoreB('')
    setWalkover(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (scoreA === '' || scoreB === '') return toast.error('Enter both scores')
    start(async () => {
      const res = await logTournamentGame({
        tournamentId,
        format: '2v2',
        aOwners: selected.aIds,
        bOwners: selected.bIds,
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

  return (
    <GlassPanel strong className="p-4 sm:p-6">
      <form onSubmit={submit} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-black uppercase tracking-tight">Log a game</h2>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            2v2 · best of {BEST_OF} · first to {WINS_NEEDED}
          </span>
        </div>

        {/* Matchup picker — the whole rotation, tap to choose who's playing */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Matchup
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {matchups.map((m) => {
              const live = series.find((s) => s.live && matchKey(s.aIds, s.bIds) === m.key)
              const active = m.key === pick
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    touched.current = true
                    setPick(m.key)
                  }}
                  className={cn(
                    'rounded-xl p-3 text-left transition-all',
                    active ? 'skeuo-btn ring-1 ring-primary/50' : 'skeuo-inset hover:bg-foreground/5',
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: m.aColor }} />
                    <span className="truncate">{m.aLabel}</span>
                  </span>
                  <span
                    className={cn(
                      'my-0.5 block text-[10px] font-bold uppercase',
                      active ? 'text-white/70' : 'text-muted-foreground',
                    )}
                  >
                    vs
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: m.bColor }} />
                    <span className="truncate">{m.bLabel}</span>
                  </span>
                  <span
                    className={cn(
                      'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                      active
                        ? 'bg-black/30 text-white'
                        : live
                          ? 'bg-primary/15 text-primary'
                          : 'bg-foreground/10 text-muted-foreground',
                    )}
                  >
                    {live ? `Series ${live.index} · ${live.winsA}–${live.winsB}` : 'New series'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Status line for the chosen matchup */}
        <p className="text-xs text-muted-foreground">
          {liveSeries ? (
            <>
              Continuing <span className="font-semibold text-foreground">Series {liveSeries.index}</span>{' '}
              — {selected.aLabel} <span className="tabular-nums">{liveSeries.winsA}</span> –{' '}
              <span className="tabular-nums">{liveSeries.winsB}</span> {selected.bLabel}. First to{' '}
              {WINS_NEEDED} takes it.
            </>
          ) : (
            <>
              Starting a fresh best-of-{BEST_OF} between {selected.aLabel} and {selected.bLabel}.
            </>
          )}
        </p>

        {/* Score entry — duos are fixed by the matchup, just enter the game.
            Two columns at every width so the scoreboard stays aligned on phones. */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-4">
          <ScoreColumn
            label={selected.aLabel}
            color={selected.aColor}
            team={aTeam}
            onTeam={setATeam}
            score={scoreA}
            onScore={setScoreA}
          />
          <div className="flex items-center justify-center pt-9 font-display text-xl font-black text-muted-foreground sm:text-2xl">
            vs
          </div>
          <ScoreColumn
            label={selected.bLabel}
            color={selected.bColor}
            team={bTeam}
            onTeam={setBTeam}
            score={scoreB}
            onScore={setScoreB}
          />
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

function ScoreColumn({
  label,
  color,
  team,
  onTeam,
  score,
  onScore,
}: {
  label: string
  color: string
  team: string
  onTeam: (v: string) => void
  score: string
  onScore: (v: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <span className="truncate font-display text-sm font-black uppercase tracking-tight sm:text-base">
          {label}
        </span>
      </div>
      <Field label="Playing as">
        <TextInput value={team} onChange={(e) => onTeam(e.target.value)} placeholder="NBA team" />
      </Field>
      <Field label="Score">
        <NumberInput
          min={0}
          value={score}
          onChange={(e) => onScore(e.target.value)}
          placeholder="0"
          className="text-center text-lg font-bold tabular-nums"
        />
      </Field>
    </div>
  )
}

/* ── OG: series board ─────────────────────────────────────────────────────── */

function SeriesBoard({
  series,
  games,
  tournamentId,
  canDelete,
}: {
  series: Series[]
  games: DetailGame[]
  tournamentId: number
  canDelete: boolean
}) {
  // Series-win tally — "who's won the most best-of-5s" (OG's real scoreboard).
  const tally = new Map<string, { label: string; color: string; won: number }>()
  for (const s of series) {
    if (s.live || !s.winner) continue
    const label = s.winner === 'a' ? s.aOwners : s.bOwners
    const color = s.winner === 'a' ? s.aColor : s.bColor
    const t = tally.get(label) ?? { label, color, won: 0 }
    t.won++
    tally.set(label, t)
  }
  const ranked = [...tally.values()].sort((a, b) => b.won - a.won)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-display text-xl font-black uppercase tracking-tight">
          Series <span className="text-muted-foreground">({series.length})</span>
        </h2>
        {ranked.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="uppercase tracking-wider">Series won:</span>
            {ranked.map((r) => (
              <span key={r.label} className="inline-flex items-center gap-1 font-semibold text-foreground">
                <span className="size-2 rounded-full" style={{ background: r.color }} />
                {r.label} {r.won}
              </span>
            ))}
          </div>
        )}
      </div>

      {series.length === 0 ? (
        <EmptyState
          icon={FlagBanner}
          title="No games logged"
          description="Pick a matchup above and log the first game — it lands in Series 1."
        />
      ) : (
        <div className="space-y-2.5">
          {[...series].reverse().map((s) => (
            <SeriesCard
              key={s.index}
              s={s}
              games={games}
              tournamentId={tournamentId}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SeriesCard({
  s,
  games,
  tournamentId,
  canDelete,
}: {
  s: Series
  games: DetailGame[]
  tournamentId: number
  canDelete: boolean
}) {
  return (
    <GlassPanel className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="skeuo-inset rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Series {s.index}
        </span>
        {s.live ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Live
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
            <Trophy weight="fill" size={9} /> Decided
          </span>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          first to {WINS_NEEDED}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <SeriesSide label={s.aOwners} color={s.aColor} won={s.winner === 'a'} align="right" />
        <div className="flex shrink-0 items-center gap-1 font-display text-xl font-black tabular-nums sm:text-2xl">
          <span className={s.winsA >= s.winsB ? '' : 'text-muted-foreground'}>{s.winsA}</span>
          <span className="text-sm text-muted-foreground">–</span>
          <span className={s.winsB >= s.winsA ? '' : 'text-muted-foreground'}>{s.winsB}</span>
        </div>
        <SeriesSide label={s.bOwners} color={s.bColor} won={s.winner === 'b'} align="left" />
      </div>

      {/* Game-by-game — each chip deletable by a commissioner */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {s.games.map((g, i) => {
          const gameId = games[s.gameIndices[i]]?.id
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md skeuo-inset px-2 py-1 text-xs font-semibold tabular-nums"
            >
              <span className="text-[9px] font-bold text-muted-foreground">G{i + 1}</span>
              <span className={g.winner === 'a' ? 'text-foreground' : 'text-muted-foreground'}>
                {g.scoreA}
              </span>
              <span className="text-muted-foreground">–</span>
              <span className={g.winner === 'b' ? 'text-foreground' : 'text-muted-foreground'}>
                {g.scoreB}
              </span>
              {g.walkover && <FlagBanner weight="fill" size={9} className="text-warning" />}
              {canDelete && gameId && (
                <DeleteGame tournamentId={tournamentId} gameId={gameId} />
              )}
            </span>
          )
        })}
      </div>
    </GlassPanel>
  )
}

function SeriesSide({
  label,
  color,
  won,
  align,
}: {
  label: string
  color: string
  won: boolean
  align: 'left' | 'right'
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-center gap-1.5',
        align === 'right' ? 'justify-end text-right' : 'text-left',
      )}
    >
      {align === 'left' && (
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
      )}
      <span
        className={cn('truncate text-sm font-bold', won ? 'text-primary' : 'text-foreground')}
      >
        {label}
        {won && <Crown weight="fill" size={12} className="ml-1 inline align-baseline text-warning" />}
      </span>
      {align === 'right' && (
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
      )}
    </div>
  )
}

function DeleteGame({ tournamentId, gameId }: { tournamentId: number; gameId: string }) {
  const router = useRouter()
  const [pending, start] = React.useTransition()
  const remove = () => {
    if (!confirm('Delete this game?')) return
    start(async () => {
      const res = await deleteTournamentGame(tournamentId, gameId)
      if (res.ok) {
        toast.success('Game deleted')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Delete failed')
      }
    })
  }
  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      aria-label="Delete game"
      className="-mr-0.5 ml-0.5 rounded p-0.5 text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      {pending ? (
        <CircleNotch weight="bold" className="size-3 animate-spin" />
      ) : (
        <Trash weight="bold" className="size-3" />
      )}
    </button>
  )
}

/* ── generic (1v1 / non-OG) form + flat list — unchanged behaviour ─────────── */

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
      <div className="flex items-center gap-2 sm:gap-3">
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
    <GlassPanel strong className="p-4 sm:p-6">
      <form onSubmit={submit} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-black uppercase tracking-tight">Log a game</h2>
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

          <div className="flex items-center justify-center pt-2 font-display text-2xl font-black text-muted-foreground sm:pt-10">
            vs
          </div>

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
