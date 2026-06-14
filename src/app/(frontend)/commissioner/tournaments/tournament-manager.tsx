'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, PencilSimple, Trash, Trophy, CaretDown } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui-bits'
import {
  Field,
  TextInput,
  NumberInput,
  Textarea,
  Select,
  MultiSelect,
  SubmitButton,
  MiniButton,
  type Option,
} from '@/components/commissioner/fields'
import { saveTournament, deleteTournament, saveMatch, deleteMatch } from '../actions'

export type MatchRow = {
  id: number
  tournament: number | null
  round: string
  status: 'scheduled' | 'live' | 'final'
  homeFranchise: string
  awayFranchise: string
  homeScore: number | null
  awayScore: number | null
  playedAt: string
}

export type TournamentRow = {
  id: number
  name: string
  format: string
  status: string
  season: string
  participants: string[]
  description: string
  champion: string
  matches: MatchRow[]
}

const FORMAT_OPTIONS: Option[] = [
  { label: 'Round Robin', value: 'round-robin' },
  { label: 'Single Elimination', value: 'single-elim' },
  { label: 'Double Elimination', value: 'double-elim' },
  { label: 'Groups + Knockout', value: 'groups-knockout' },
  { label: 'Season League', value: 'season-league' },
]

const STATUS_OPTIONS: Option[] = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
]

const MATCH_STATUS_OPTIONS: Option[] = [
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Live', value: 'live' },
  { label: 'Final', value: 'final' },
]

const formatLabel = (v: string) => FORMAT_OPTIONS.find((o) => o.value === v)?.label ?? '—'
const statusLabel = (v: string) => STATUS_OPTIONS.find((o) => o.value === v)?.label ?? '—'

const blankTournament = (): TournamentRow => ({
  id: 0,
  name: '',
  format: 'round-robin',
  status: 'upcoming',
  season: '',
  participants: [],
  description: '',
  champion: '',
  matches: [],
})

const blankMatch = (tournamentId: number): MatchRow => ({
  id: 0,
  tournament: tournamentId,
  round: '',
  status: 'scheduled',
  homeFranchise: '',
  awayFranchise: '',
  homeScore: null,
  awayScore: null,
  playedAt: '',
})

export function TournamentManager({
  tournaments,
  franchiseOptions,
}: {
  tournaments: TournamentRow[]
  franchiseOptions: Option[]
}) {
  const router = useRouter()
  const [editing, setEditing] = React.useState<TournamentRow | null>(null)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tournaments.length} tournaments</p>
        {!editing && (
          <SubmitButton onClick={() => setEditing(blankTournament())}>
            <Plus weight="bold" className="size-4" /> New tournament
          </SubmitButton>
        )}
      </div>

      {editing && (
        <TournamentForm
          key={editing.id}
          initial={editing}
          franchiseOptions={franchiseOptions}
          onDone={() => {
            setEditing(null)
            router.refresh()
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {tournaments.length === 0 && !editing ? (
        <EmptyState
          icon={Trophy}
          title="No tournaments yet"
          description="Create your first tournament to start scheduling matches."
        />
      ) : (
        <ul className="space-y-4">
          {tournaments.map((t) => (
            <TournamentCard
              key={t.id}
              tournament={t}
              franchiseOptions={franchiseOptions}
              onEdit={() => setEditing(t)}
              onDone={() => router.refresh()}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function TournamentCard({
  tournament,
  franchiseOptions,
  onEdit,
  onDone,
}: {
  tournament: TournamentRow
  franchiseOptions: Option[]
  onEdit: () => void
  onDone: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [addingMatch, setAddingMatch] = React.useState<MatchRow | null>(null)
  const championLabel =
    tournament.champion === ''
      ? null
      : (franchiseOptions.find((o) => o.value === tournament.champion)?.label ?? null)

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-foreground/[0.02]">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Collapse matches' : 'Expand matches'}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <CaretDown
            weight="bold"
            className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        <div className="min-w-0">
          <div className="font-display text-lg font-black uppercase leading-tight tracking-tight">
            {tournament.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatLabel(tournament.format)} · {statusLabel(tournament.status)}
            {tournament.season ? ` · ${tournament.season}` : ''} · {tournament.participants.length}{' '}
            {tournament.participants.length === 1 ? 'team' : 'teams'}
            {championLabel ? ` · 🏆 ${championLabel}` : ''}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <MiniButton onClick={onEdit}>
            <PencilSimple weight="bold" className="size-4" />
          </MiniButton>
          <DeleteTournamentButton id={tournament.id} name={tournament.name} onDone={onDone} />
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Matches ({tournament.matches.length})
            </h4>
            {!addingMatch && (
              <MiniButton onClick={() => setAddingMatch(blankMatch(tournament.id))}>
                <Plus weight="bold" className="size-4" /> Add match
              </MiniButton>
            )}
          </div>

          {addingMatch && (
            <MatchForm
              key={addingMatch.id}
              initial={addingMatch}
              tournamentId={tournament.id}
              franchiseOptions={franchiseOptions}
              onDone={() => {
                setAddingMatch(null)
                onDone()
              }}
              onCancel={() => setAddingMatch(null)}
            />
          )}

          {tournament.matches.length === 0 && !addingMatch ? (
            <p className="text-sm text-muted-foreground">No matches scheduled.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {tournament.matches.map((m) => (
                <MatchRowItem
                  key={m.id}
                  match={m}
                  tournamentId={tournament.id}
                  franchiseOptions={franchiseOptions}
                  onDone={onDone}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}

function MatchRowItem({
  match,
  tournamentId,
  franchiseOptions,
  onDone,
}: {
  match: MatchRow
  tournamentId: number
  franchiseOptions: Option[]
  onDone: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const home = franchiseOptions.find((o) => o.value === match.homeFranchise)?.label ?? '—'
  const away = franchiseOptions.find((o) => o.value === match.awayFranchise)?.label ?? '—'

  if (editing) {
    return (
      <li className="bg-foreground/[0.02] p-3">
        <MatchForm
          initial={match}
          tournamentId={tournamentId}
          franchiseOptions={franchiseOptions}
          onDone={() => {
            setEditing(false)
            onDone()
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 bg-foreground/[0.02] px-3 py-2.5">
      <div className="min-w-0 text-sm">
        <span className="font-semibold">{home}</span>{' '}
        <span className="font-display font-black tabular-nums">
          {match.homeScore ?? '–'} : {match.awayScore ?? '–'}
        </span>{' '}
        <span className="font-semibold">{away}</span>
        {match.round ? (
          <span className="ml-2 text-xs text-muted-foreground">{match.round}</span>
        ) : null}
      </div>
      <span className="ml-auto rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {match.status}
      </span>
      <div className="flex items-center gap-1">
        <MiniButton onClick={() => setEditing(true)}>
          <PencilSimple weight="bold" className="size-4" />
        </MiniButton>
        <DeleteMatchButton id={match.id} onDone={onDone} />
      </div>
    </li>
  )
}

function TournamentForm({
  initial,
  franchiseOptions,
  onDone,
  onCancel,
}: {
  initial: TournamentRow
  franchiseOptions: Option[]
  onDone: () => void
  onCancel: () => void
}) {
  const [f, setF] = React.useState(initial)
  const [pending, start] = React.useTransition()
  const isNew = !initial.id
  const set = <K extends keyof TournamentRow>(k: K, v: TournamentRow[K]) =>
    setF((p) => ({ ...p, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return toast.error('Tournament name is required')
    start(async () => {
      const res = await saveTournament({
        id: f.id || undefined,
        name: f.name,
        format: f.format,
        status: f.status,
        season: f.season,
        participants: f.participants,
        description: f.description,
        champion: f.champion,
      })
      if (res.ok) {
        toast.success(isNew ? 'Tournament created' : 'Tournament updated')
        onDone()
      } else {
        toast.error(res.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={submit} className="glass-strong space-y-4 rounded-2xl p-5">
      <h3 className="font-display text-lg font-black uppercase tracking-tight">
        {isNew ? 'New tournament' : `Edit ${initial.name}`}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <TextInput
            value={f.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Dais Cup"
          />
        </Field>
        <Field label="Season" hint='e.g. "Season 1"'>
          <TextInput
            value={f.season}
            onChange={(e) => set('season', e.target.value)}
            placeholder="Season 1"
          />
        </Field>
        <Field label="Format">
          <Select
            value={f.format}
            onChange={(e) => set('format', e.target.value)}
            options={FORMAT_OPTIONS}
          />
        </Field>
        <Field label="Status">
          <Select
            value={f.status}
            onChange={(e) => set('status', e.target.value)}
            options={STATUS_OPTIONS}
          />
        </Field>
      </div>
      <Field label="Participants">
        <MultiSelect
          options={franchiseOptions}
          value={f.participants}
          onChange={(v) => set('participants', v)}
          empty="No franchises yet"
        />
      </Field>
      <Field label="Champion">
        <Select
          value={f.champion}
          onChange={(e) => set('champion', e.target.value)}
          options={franchiseOptions}
          placeholder="— none —"
        />
      </Field>
      <Field label="Description">
        <Textarea value={f.description} onChange={(e) => set('description', e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <SubmitButton type="submit" pending={pending}>
          {isNew ? 'Create tournament' : 'Save changes'}
        </SubmitButton>
        <MiniButton type="button" onClick={onCancel}>
          Cancel
        </MiniButton>
      </div>
    </form>
  )
}

function MatchForm({
  initial,
  tournamentId,
  franchiseOptions,
  onDone,
  onCancel,
}: {
  initial: MatchRow
  tournamentId: number
  franchiseOptions: Option[]
  onDone: () => void
  onCancel: () => void
}) {
  const [f, setF] = React.useState(initial)
  const [pending, start] = React.useTransition()
  const isNew = !initial.id
  const set = <K extends keyof MatchRow>(k: K, v: MatchRow[K]) => setF((p) => ({ ...p, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.homeFranchise) return toast.error('Home team is required')
    if (!f.awayFranchise) return toast.error('Away team is required')
    start(async () => {
      const res = await saveMatch({
        id: f.id || undefined,
        tournament: String(tournamentId),
        round: f.round,
        status: f.status,
        homeFranchise: f.homeFranchise,
        awayFranchise: f.awayFranchise,
        homeScore: f.homeScore == null ? '' : String(f.homeScore),
        awayScore: f.awayScore == null ? '' : String(f.awayScore),
        playedAt: f.playedAt,
      })
      if (res.ok) {
        toast.success(isNew ? 'Match added' : 'Match updated')
        onDone()
      } else {
        toast.error(res.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={submit} className="glass-strong space-y-4 rounded-2xl p-4">
      <h4 className="font-display text-base font-black uppercase tracking-tight">
        {isNew ? 'Add match' : 'Edit match'}
      </h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Round" hint='e.g. "Quarterfinal"'>
          <TextInput
            value={f.round}
            onChange={(e) => set('round', e.target.value)}
            placeholder="Quarterfinal"
          />
        </Field>
        <Field label="Status">
          <Select
            value={f.status}
            onChange={(e) => set('status', e.target.value as MatchRow['status'])}
            options={MATCH_STATUS_OPTIONS}
          />
        </Field>
        <Field label="Home team">
          <Select
            value={f.homeFranchise}
            onChange={(e) => set('homeFranchise', e.target.value)}
            options={franchiseOptions}
            placeholder="— select —"
          />
        </Field>
        <Field label="Away team">
          <Select
            value={f.awayFranchise}
            onChange={(e) => set('awayFranchise', e.target.value)}
            options={franchiseOptions}
            placeholder="— select —"
          />
        </Field>
        <Field label="Home score">
          <NumberInput
            value={f.homeScore ?? ''}
            onChange={(e) => set('homeScore', e.target.value === '' ? null : Number(e.target.value))}
          />
        </Field>
        <Field label="Away score">
          <NumberInput
            value={f.awayScore ?? ''}
            onChange={(e) => set('awayScore', e.target.value === '' ? null : Number(e.target.value))}
          />
        </Field>
      </div>
      <Field label="Played at">
        <TextInput
          type="datetime-local"
          value={f.playedAt}
          onChange={(e) => set('playedAt', e.target.value)}
        />
      </Field>
      <div className="flex gap-2">
        <SubmitButton type="submit" pending={pending}>
          {isNew ? 'Add match' : 'Save changes'}
        </SubmitButton>
        <MiniButton type="button" onClick={onCancel}>
          Cancel
        </MiniButton>
      </div>
    </form>
  )
}

function DeleteTournamentButton({
  id,
  name,
  onDone,
}: {
  id: number
  name: string
  onDone: () => void
}) {
  const [pending, start] = React.useTransition()
  return (
    <MiniButton
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
        start(async () => {
          const res = await deleteTournament(id)
          if (res.ok) {
            toast.success('Tournament deleted')
            onDone()
          } else {
            toast.error(res.error ?? 'Delete failed')
          }
        })
      }}
    >
      <Trash weight="bold" className="size-4" />
    </MiniButton>
  )
}

function DeleteMatchButton({ id, onDone }: { id: number; onDone: () => void }) {
  const [pending, start] = React.useTransition()
  return (
    <MiniButton
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm('Delete this match? This cannot be undone.')) return
        start(async () => {
          const res = await deleteMatch(id)
          if (res.ok) {
            toast.success('Match deleted')
            onDone()
          } else {
            toast.error(res.error ?? 'Delete failed')
          }
        })
      }}
    >
      <Trash weight="bold" className="size-4" />
    </MiniButton>
  )
}
