'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus,
  Crown,
  Trophy,
  FlagBanner,
  ArrowUUpLeft,
  CircleNotch,
  Confetti,
} from '@phosphor-icons/react'
import { GlassPanel } from '@/components/ui-bits'
import { TeamLogo } from '@/components/team-logo'
import { Field, NumberInput, TextInput, SubmitButton, MiniButton } from '@/components/commissioner/fields'
import { logTripleThreatMatch, undoTripleThreatMatch } from '../actions'
import { isCommissionerViewer } from '@/app/(frontend)/matches/actions'
import { cn } from '@/lib/utils'

export type TTPlayerView = { id: string; owner: string; color: string }
export type TTMatchView = {
  slot: 'semi' | 'elim' | 'final'
  home: string
  away: string
  homeScore: number | null
  awayScore: number | null
  homeTeam: string | null
  awayTeam: string | null
  walkover: boolean
}

const SLOT_LABEL: Record<TTMatchView['slot'], string> = {
  semi: 'Opening Game',
  elim: 'Elimination',
  final: 'Final',
}
const SLOT_SUB: Record<TTMatchView['slot'], string> = {
  semi: 'Winner waits in the final · loser drops to the elimination game',
  elim: 'Semi loser vs the benched player · winner reaches the final',
  final: 'Semi winner vs elimination winner · winner takes the ring',
}

const winnerId = (m: TTMatchView): string =>
  (m.homeScore ?? 0) > (m.awayScore ?? 0) ? m.home : m.away
const loserId = (m: TTMatchView): string => (winnerId(m) === m.home ? m.away : m.home)

/* ── entry ────────────────────────────────────────────────────────────────── */

export function TripleThreatBoard({
  tournamentId,
  players,
  matches,
  championId,
}: {
  tournamentId: number
  players: TTPlayerView[]
  matches: TTMatchView[]
  championId: string | null
}) {
  const [canManage, setCanManage] = React.useState(false)
  React.useEffect(() => {
    let active = true
    isCommissionerViewer().then((v) => active && setCanManage(v))
    return () => {
      active = false
    }
  }, [])

  const byId = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players])
  const get = (id: string): TTPlayerView =>
    byId.get(id) ?? { id, owner: '—', color: '#DF2604' }

  const semi = matches[0]
  const elim = matches[1]
  const final = matches[2]
  const stage = matches.length // 0 → opening · 1 → elimination · 2 → final · 3 → done
  const champion = championId ? get(championId) : null

  // Pairings for games not yet played (derived from prior results).
  const benched = semi
    ? players.find((p) => p.id !== semi.home && p.id !== semi.away) ?? null
    : null
  const elimNext = semi && benched ? { home: loserId(semi), away: benched.id } : null
  const finalNext = semi && elim ? { home: winnerId(semi), away: winnerId(elim) } : null

  return (
    <div className="space-y-6">
      {champion && <ChampionBanner player={champion} />}

      {/* ── Logger for the current stage ─────────────────────────── */}
      {stage < 3 &&
        (stage === 0 ? (
          <OpeningLogger tournamentId={tournamentId} players={players} />
        ) : (
          <FixedLogger
            tournamentId={tournamentId}
            slot={stage === 1 ? 'elim' : 'final'}
            home={get((stage === 1 ? elimNext! : finalNext!).home)}
            away={get((stage === 1 ? elimNext! : finalNext!).away)}
          />
        ))}

      {/* ── Bracket ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-black uppercase tracking-tight">Bracket</h2>
        <div className="space-y-2.5">
          <GameCard
            slot="semi"
            live={stage === 0}
            m={semi}
            pair={semi ? { home: semi.home, away: semi.away } : null}
            get={get}
          />
          <GameCard
            slot="elim"
            live={stage === 1}
            m={elim}
            pair={elimNext}
            get={get}
            waitingLabel="Awaits the opening game"
          />
          <GameCard
            slot="final"
            live={stage === 2}
            m={final}
            pair={finalNext}
            get={get}
            waitingLabel="Awaits both semi-final results"
          />
        </div>
      </section>

      {canManage && matches.length > 0 && (
        <UndoButton tournamentId={tournamentId} lastSlot={matches[matches.length - 1].slot} />
      )}
    </div>
  )
}

/* ── champion banner ──────────────────────────────────────────────────────── */

function ChampionBanner({ player }: { player: TTPlayerView }) {
  return (
    <GlassPanel strong className="foil relative overflow-hidden p-6 text-center sm:p-8">
      <Confetti
        weight="fill"
        className="pointer-events-none absolute -left-4 -top-4 size-24 text-warning/15"
      />
      <Confetti
        weight="fill"
        className="pointer-events-none absolute -bottom-6 -right-4 size-28 rotate-180 text-warning/15"
      />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-warning">
          <Trophy weight="fill" size={12} /> Triple Threat Champion
        </span>
        <div className="mt-4 flex items-center justify-center gap-3">
          <span
            className="grid size-12 place-items-center rounded-full ring-2 ring-warning/40"
            style={{ background: player.color }}
          >
            <Crown weight="fill" size={24} className="text-white" />
          </span>
          <h3 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
            {player.owner}
          </h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Three games, one ring — {player.owner} runs the table.
        </p>
      </div>
    </GlassPanel>
  )
}

/* ── bracket game card ────────────────────────────────────────────────────── */

function GameCard({
  slot,
  live,
  m,
  pair,
  get,
  waitingLabel,
}: {
  slot: TTMatchView['slot']
  live: boolean
  m?: TTMatchView
  pair: { home: string; away: string } | null
  get: (id: string) => TTPlayerView
  waitingLabel?: string
}) {
  const played = !!m
  const win = m ? winnerId(m) : null

  return (
    <GlassPanel className={cn('p-4 sm:p-5', live && 'ring-1 ring-primary/50')}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="skeuo-inset rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {SLOT_LABEL[slot]}
        </span>
        {played ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
            <Trophy weight="fill" size={9} /> Decided
          </span>
        ) : live ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Up next
          </span>
        ) : (
          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Pending
          </span>
        )}
      </div>

      {pair ? (
        <div className="flex items-center gap-2 sm:gap-3">
          <BracketSide
            player={get(pair.home)}
            team={m?.homeTeam ?? null}
            score={m?.homeScore ?? null}
            won={played && win === pair.home}
            dim={played && win !== pair.home}
            align="right"
          />
          <div className="shrink-0 font-display text-lg font-black text-muted-foreground sm:text-xl">
            {played ? (
              <span className="tabular-nums text-foreground">
                {m!.homeScore}
                <span className="mx-1 text-sm text-muted-foreground">–</span>
                {m!.awayScore}
              </span>
            ) : (
              'vs'
            )}
          </div>
          <BracketSide
            player={get(pair.away)}
            team={m?.awayTeam ?? null}
            score={m?.awayScore ?? null}
            won={played && win === pair.away}
            dim={played && win !== pair.away}
            align="left"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{waitingLabel ?? 'To be determined'}</p>
      )}

      {m?.walkover && (
        <div className="mt-2 flex justify-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning">
            <FlagBanner weight="fill" size={9} /> Walkover
          </span>
        </div>
      )}
    </GlassPanel>
  )
}

function BracketSide({
  player,
  team,
  score: _score,
  won,
  dim,
  align,
}: {
  player: TTPlayerView
  team: string | null
  score: number | null
  won: boolean
  dim: boolean
  align: 'left' | 'right'
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-0.5',
        align === 'right' ? 'items-end text-right' : 'items-start text-left',
        dim && 'opacity-55',
      )}
    >
      <span className="flex items-center gap-1.5">
        {align === 'left' && (
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: player.color }} />
        )}
        <span className={cn('truncate text-sm font-bold', won ? 'text-primary' : 'text-foreground')}>
          {player.owner}
          {won && <Crown weight="fill" size={12} className="ml-1 inline align-baseline text-warning" />}
        </span>
        {align === 'right' && (
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: player.color }} />
        )}
      </span>
      {team && (
        <span
          className={cn(
            'flex items-center gap-1 text-xs text-muted-foreground',
            align === 'right' && 'flex-row-reverse',
          )}
        >
          <TeamLogo name={team} size={13} />
          <span className="truncate">{team}</span>
        </span>
      )}
    </div>
  )
}

/* ── opening-game logger (pick two of three) ──────────────────────────────── */

function OpeningLogger({
  tournamentId,
  players,
}: {
  tournamentId: number
  players: TTPlayerView[]
}) {
  const router = useRouter()
  const [openers, setOpeners] = React.useState<string[]>([players[0]?.id, players[1]?.id])
  const [homeTeam, setHomeTeam] = React.useState('')
  const [awayTeam, setAwayTeam] = React.useState('')
  const [homeScore, setHomeScore] = React.useState('')
  const [awayScore, setAwayScore] = React.useState('')
  const [walkover, setWalkover] = React.useState(false)
  const [pending, start] = React.useTransition()

  // Tapping a chip keeps the two most recent picks selected.
  const toggle = (id: string) =>
    setOpeners((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 2 ? [...cur, id] : [cur[1], id],
    )

  const [homeId, awayId] = openers
  const home = players.find((p) => p.id === homeId)
  const away = players.find((p) => p.id === awayId)
  const bench = players.find((p) => !openers.includes(p.id))

  const reset = () => {
    setHomeTeam('')
    setAwayTeam('')
    setHomeScore('')
    setAwayScore('')
    setWalkover(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (openers.length !== 2 || !homeId || !awayId) return toast.error('Pick the two opening players')
    if (homeScore === '' || awayScore === '') return toast.error('Enter both scores')
    if (Number(homeScore) === Number(awayScore)) return toast.error('The opening game needs a winner')
    start(async () => {
      const res = await logTripleThreatMatch({
        tournamentId,
        homeId,
        awayId,
        homeScore,
        awayScore,
        homeTeam,
        awayTeam,
        walkover,
      })
      if (res.ok) {
        toast.success('Opening game logged')
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
          <h2 className="font-display text-lg font-black uppercase tracking-tight">Opening game</h2>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            pick two · loser plays the third next
          </span>
        </div>

        {/* Player picker */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Who tips off?
          </p>
          <div className="grid grid-cols-3 gap-2">
            {players.map((p) => {
              const active = openers.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 transition-all',
                    active
                      ? 'skeuo-btn ring-2 ring-inset ring-primary'
                      : 'skeuo-inset text-foreground/70 hover:text-foreground',
                  )}
                >
                  <span className="size-3 rounded-full" style={{ background: p.color }} />
                  <span className="max-w-full truncate text-sm font-bold uppercase tracking-tight">
                    {p.owner}
                  </span>
                </button>
              )
            })}
          </div>
          {bench && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{bench.owner}</span> sits out — plays
              the loser in the elimination game.
            </p>
          )}
        </div>

        {/* Scores */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-4">
          <ScoreColumn
            label={home?.owner ?? 'Player 1'}
            color={home?.color ?? '#DF2604'}
            team={homeTeam}
            onTeam={setHomeTeam}
            score={homeScore}
            onScore={setHomeScore}
          />
          <div className="flex items-center justify-center pt-9 font-display text-xl font-black text-muted-foreground sm:text-2xl">
            vs
          </div>
          <ScoreColumn
            label={away?.owner ?? 'Player 2'}
            color={away?.color ?? '#DF2604'}
            team={awayTeam}
            onTeam={setAwayTeam}
            score={awayScore}
            onScore={setAwayScore}
          />
        </div>

        <WalkoverToggle on={walkover} onChange={setWalkover} />

        <div className="flex items-center gap-2">
          <SubmitButton type="submit" pending={pending}>
            <Plus weight="bold" className="size-4" /> Log opening game
          </SubmitButton>
          <MiniButton type="button" onClick={reset}>
            Clear
          </MiniButton>
        </div>
      </form>
    </GlassPanel>
  )
}

/* ── fixed-pairing logger (elimination + final) ───────────────────────────── */

function FixedLogger({
  tournamentId,
  slot,
  home,
  away,
}: {
  tournamentId: number
  slot: 'elim' | 'final'
  home: TTPlayerView
  away: TTPlayerView
}) {
  const router = useRouter()
  const [homeTeam, setHomeTeam] = React.useState('')
  const [awayTeam, setAwayTeam] = React.useState('')
  const [homeScore, setHomeScore] = React.useState('')
  const [awayScore, setAwayScore] = React.useState('')
  const [walkover, setWalkover] = React.useState(false)
  const [pending, start] = React.useTransition()

  const reset = () => {
    setHomeTeam('')
    setAwayTeam('')
    setHomeScore('')
    setAwayScore('')
    setWalkover(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (homeScore === '' || awayScore === '') return toast.error('Enter both scores')
    if (Number(homeScore) === Number(awayScore))
      return toast.error(`The ${slot === 'final' ? 'final' : 'elimination game'} needs a winner`)
    start(async () => {
      const res = await logTripleThreatMatch({
        tournamentId,
        homeId: home.id,
        awayId: away.id,
        homeScore,
        awayScore,
        homeTeam,
        awayTeam,
        walkover,
      })
      if (res.ok) {
        toast.success(res.slot === 'final' ? '🏆 Champion crowned!' : 'Elimination game logged')
        reset()
        router.refresh()
      } else {
        toast.error(res.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <GlassPanel strong className={cn('p-4 sm:p-6', slot === 'final' && 'ring-1 ring-warning/40')}>
      <form onSubmit={submit} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-black uppercase tracking-tight">
            {slot === 'final' && <Trophy weight="fill" size={18} className="text-warning" />}
            {slot === 'final' ? 'The Final' : 'Elimination game'}
          </h2>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {SLOT_SUB[slot]}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-4">
          <ScoreColumn
            label={home.owner}
            color={home.color}
            team={homeTeam}
            onTeam={setHomeTeam}
            score={homeScore}
            onScore={setHomeScore}
          />
          <div className="flex items-center justify-center pt-9 font-display text-xl font-black text-muted-foreground sm:text-2xl">
            vs
          </div>
          <ScoreColumn
            label={away.owner}
            color={away.color}
            team={awayTeam}
            onTeam={setAwayTeam}
            score={awayScore}
            onScore={setAwayScore}
          />
        </div>

        <WalkoverToggle on={walkover} onChange={setWalkover} />

        <div className="flex items-center gap-2">
          <SubmitButton type="submit" pending={pending}>
            <Plus weight="bold" className="size-4" />{' '}
            {slot === 'final' ? 'Log the final' : 'Log elimination game'}
          </SubmitButton>
          <MiniButton type="button" onClick={reset}>
            Clear
          </MiniButton>
        </div>
      </form>
    </GlassPanel>
  )
}

/* ── shared bits ──────────────────────────────────────────────────────────── */

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

function WalkoverToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-primary"
      />
      <FlagBanner weight="fill" className={cn('size-4', on ? 'text-primary' : 'text-muted-foreground')} />
      Walkover — the loser earns a Walk of Shame mark
    </label>
  )
}

function UndoButton({
  tournamentId,
  lastSlot,
}: {
  tournamentId: number
  lastSlot: TTMatchView['slot']
}) {
  const router = useRouter()
  const [pending, start] = React.useTransition()
  const undo = () => {
    if (!confirm(`Undo the last game (${SLOT_LABEL[lastSlot]})?`)) return
    start(async () => {
      const res = await undoTripleThreatMatch(tournamentId)
      if (res.ok) {
        toast.success('Last game undone')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Undo failed')
      }
    })
  }
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={undo}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      >
        {pending ? (
          <CircleNotch weight="bold" className="size-3.5 animate-spin" />
        ) : (
          <ArrowUUpLeft weight="bold" className="size-3.5" />
        )}
        Undo last game ({SLOT_LABEL[lastSlot]})
      </button>
    </div>
  )
}
