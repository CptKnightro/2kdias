'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus,
  PencilSimple,
  Trash,
  MagnifyingGlass,
  Basketball,
  Trophy,
} from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui-bits'
import {
  Field,
  TextInput,
  NumberInput,
  Textarea,
  Select,
  SubmitButton,
  MiniButton,
  type Option,
} from '@/components/commissioner/fields'
import { POSITIONS, PLAYER_STATUSES, PLAYER_CATEGORIES } from '@/lib/constants'
import { savePlayer, deletePlayer, createAward, deleteAward } from '../actions'

const MAX_ROWS = 60

const POSITION_OPTIONS: Option[] = POSITIONS.map((x) => ({ label: x, value: x }))
const STATUS_OPTIONS: Option[] = PLAYER_STATUSES.map((x) => ({ label: x, value: x }))
const CATEGORY_OPTIONS: Option[] = PLAYER_CATEGORIES.map((x) => ({ label: x, value: x }))

const AWARD_TYPE_OPTIONS: Option[] = [
  { label: 'Champion', value: 'champion' },
  { label: 'MVP', value: 'mvp' },
  { label: 'Defensive POY', value: 'dpoy' },
  { label: 'Most Improved', value: 'mip' },
  { label: 'GOAT Owner', value: 'goat-owner' },
  { label: 'Other', value: 'other' },
]

export type PlayerRow = {
  id: number
  name: string
  position: string
  ovr: number
  category: string
  nbaTeam: string
  status: string
  franchise: string
  basePrice: number | null
  soldPrice: number | null
}

export type AwardRow = {
  id: number
  title: string
  type: string
  season: string
  franchiseName: string
  playerName: string
  note: string
}

const blankPlayer = (): PlayerRow => ({
  id: 0,
  name: '',
  position: '',
  ovr: 0,
  category: '',
  nbaTeam: '',
  status: 'available',
  franchise: '',
  basePrice: null,
  soldPrice: null,
})

const blankAward = () => ({
  title: '',
  type: '',
  season: '',
  franchise: '',
  player: '',
  note: '',
})

export function PlayerManager({
  players,
  franchiseOptions,
  playerOptions,
  awards,
}: {
  players: PlayerRow[]
  franchiseOptions: Option[]
  playerOptions: Option[]
  awards: AwardRow[]
}) {
  return (
    <div className="space-y-10">
      <PlayersSection players={players} franchiseOptions={franchiseOptions} />
      <AwardsSection
        awards={awards}
        franchiseOptions={franchiseOptions}
        playerOptions={playerOptions}
      />
    </div>
  )
}

// — Players —————————————————————————————————————————————————————————————————

function PlayersSection({
  players,
  franchiseOptions,
}: {
  players: PlayerRow[]
  franchiseOptions: Option[]
}) {
  const router = useRouter()
  const [editing, setEditing] = React.useState<PlayerRow | null>(null)
  const [query, setQuery] = React.useState('')

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return players
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.nbaTeam.toLowerCase().includes(q),
    )
  }, [players, query])

  const shown = filtered.slice(0, MAX_ROWS)
  const teamName = (v: string) => franchiseOptions.find((o) => o.value === v)?.label

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-black uppercase tracking-tight">Players</h2>
        {!editing && (
          <SubmitButton onClick={() => setEditing(blankPlayer())}>
            <Plus weight="bold" className="size-4" /> New player
          </SubmitButton>
        )}
      </div>

      {editing && (
        <PlayerForm
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

      <div className="relative">
        <MagnifyingGlass
          weight="bold"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or NBA team…"
          className="pl-9"
        />
      </div>

      {players.length === 0 ? (
        <EmptyState
          icon={Basketball}
          title="No players yet"
          description="Seed the player pool or add players manually."
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No players match “{query}”.</p>
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {shown.map((p) => (
              <li key={p.id} className="flex items-center gap-3 bg-foreground/[0.02] px-4 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg font-display text-lg font-black tabular-nums skeuo-inset">
                  {p.ovr}
                </span>
                <div className="min-w-0">
                  <div className="font-display text-lg font-black uppercase leading-tight tracking-tight">
                    {p.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[p.position, p.nbaTeam, p.status].filter(Boolean).join(' · ')}
                    {teamName(p.franchise) ? ` · ${teamName(p.franchise)}` : ''}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <MiniButton onClick={() => setEditing(p)}>
                    <PencilSimple weight="bold" className="size-4" />
                  </MiniButton>
                  <PlayerDeleteButton id={p.id} name={p.name} onDone={() => router.refresh()} />
                </div>
              </li>
            ))}
          </ul>
          {filtered.length > shown.length && (
            <p className="text-xs text-muted-foreground">
              Showing {shown.length} of {filtered.length} — refine search to narrow down.
            </p>
          )}
        </>
      )}
    </section>
  )
}

function PlayerForm({
  initial,
  franchiseOptions,
  onDone,
  onCancel,
}: {
  initial: PlayerRow
  franchiseOptions: Option[]
  onDone: () => void
  onCancel: () => void
}) {
  const [f, setF] = React.useState(initial)
  const [pending, start] = React.useTransition()
  const isNew = !initial.id
  const set = <K extends keyof PlayerRow>(k: K, v: PlayerRow[K]) =>
    setF((p) => ({ ...p, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return toast.error('Player name is required')
    start(async () => {
      const res = await savePlayer({
        id: f.id || undefined,
        name: f.name,
        position: f.position,
        ovr: String(f.ovr),
        category: f.category,
        nbaTeam: f.nbaTeam,
        status: f.status,
        franchise: f.franchise,
        basePrice: f.basePrice == null ? '' : String(f.basePrice),
        soldPrice: f.soldPrice == null ? '' : String(f.soldPrice),
      })
      if (res.ok) {
        toast.success(isNew ? 'Player created' : 'Player updated')
        onDone()
      } else {
        toast.error(res.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={submit} className="glass-strong space-y-4 rounded-2xl p-5">
      <h3 className="font-display text-lg font-black uppercase tracking-tight">
        {isNew ? 'New player' : `Edit ${initial.name}`}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <TextInput
            value={f.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="LeBron James"
          />
        </Field>
        <Field label="Position">
          <Select
            value={f.position}
            onChange={(e) => set('position', e.target.value)}
            options={POSITION_OPTIONS}
            placeholder="— none —"
          />
        </Field>
        <Field label="Overall (OVR)">
          <NumberInput
            value={f.ovr}
            min={0}
            max={99}
            onChange={(e) => set('ovr', Number(e.target.value))}
          />
        </Field>
        <Field label="Category">
          <Select
            value={f.category}
            onChange={(e) => set('category', e.target.value)}
            options={CATEGORY_OPTIONS}
            placeholder="— none —"
          />
        </Field>
        <Field label="NBA team">
          <TextInput
            value={f.nbaTeam}
            onChange={(e) => set('nbaTeam', e.target.value)}
            placeholder="Lakers"
          />
        </Field>
        <Field label="Status">
          <Select
            value={f.status}
            onChange={(e) => set('status', e.target.value)}
            options={STATUS_OPTIONS}
          />
        </Field>
        <Field label="Franchise">
          <Select
            value={f.franchise}
            onChange={(e) => set('franchise', e.target.value)}
            options={franchiseOptions}
            placeholder="— free agent —"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Base price">
            <NumberInput
              value={f.basePrice ?? ''}
              onChange={(e) =>
                set('basePrice', e.target.value === '' ? null : Number(e.target.value))
              }
            />
          </Field>
          <Field label="Sold price">
            <NumberInput
              value={f.soldPrice ?? ''}
              onChange={(e) =>
                set('soldPrice', e.target.value === '' ? null : Number(e.target.value))
              }
            />
          </Field>
        </div>
      </div>
      <div className="flex gap-2">
        <SubmitButton type="submit" pending={pending}>
          {isNew ? 'Create player' : 'Save changes'}
        </SubmitButton>
        <MiniButton type="button" onClick={onCancel}>
          Cancel
        </MiniButton>
      </div>
    </form>
  )
}

function PlayerDeleteButton({
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
          const res = await deletePlayer(id)
          if (res.ok) {
            toast.success('Player deleted')
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

// — Awards ——————————————————————————————————————————————————————————————————

function AwardsSection({
  awards,
  franchiseOptions,
  playerOptions,
}: {
  awards: AwardRow[]
  franchiseOptions: Option[]
  playerOptions: Option[]
}) {
  const router = useRouter()
  const [creating, setCreating] = React.useState(false)

  const typeLabel = (v: string) => AWARD_TYPE_OPTIONS.find((o) => o.value === v)?.label

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-black uppercase tracking-tight">Awards</h2>
        {!creating && (
          <SubmitButton onClick={() => setCreating(true)}>
            <Plus weight="bold" className="size-4" /> New award
          </SubmitButton>
        )}
      </div>

      {creating && (
        <AwardForm
          franchiseOptions={franchiseOptions}
          playerOptions={playerOptions}
          onDone={() => {
            setCreating(false)
            router.refresh()
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {awards.length === 0 && !creating ? (
        <EmptyState
          icon={Trophy}
          title="No awards yet"
          description="Hand out a championship, MVP, or season honor."
        />
      ) : awards.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {awards.map((a) => (
            <li key={a.id} className="flex items-center gap-3 bg-foreground/[0.02] px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg text-primary skeuo-inset">
                <Trophy weight="bold" className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="font-display text-lg font-black uppercase leading-tight tracking-tight">
                  {a.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {[typeLabel(a.type) ?? a.type, a.season, a.franchiseName, a.playerName]
                    .filter(Boolean)
                    .join(' · ') || 'No details'}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <AwardDeleteButton id={a.id} title={a.title} onDone={() => router.refresh()} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function AwardForm({
  franchiseOptions,
  playerOptions,
  onDone,
  onCancel,
}: {
  franchiseOptions: Option[]
  playerOptions: Option[]
  onDone: () => void
  onCancel: () => void
}) {
  const [f, setF] = React.useState(blankAward())
  const [pending, start] = React.useTransition()
  const set = <K extends keyof ReturnType<typeof blankAward>>(
    k: K,
    v: ReturnType<typeof blankAward>[K],
  ) => setF((p) => ({ ...p, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.title.trim()) return toast.error('Award title is required')
    start(async () => {
      const res = await createAward({
        title: f.title,
        type: f.type,
        season: f.season,
        franchise: f.franchise,
        player: f.player,
        note: f.note,
      })
      if (res.ok) {
        toast.success('Award created')
        onDone()
      } else {
        toast.error(res.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={submit} className="glass-strong space-y-4 rounded-2xl p-5">
      <h3 className="font-display text-lg font-black uppercase tracking-tight">New award</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <TextInput
            value={f.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="2026 Champion"
          />
        </Field>
        <Field label="Type">
          <Select
            value={f.type}
            onChange={(e) => set('type', e.target.value)}
            options={AWARD_TYPE_OPTIONS}
            placeholder="— type —"
          />
        </Field>
        <Field label="Season">
          <TextInput
            value={f.season}
            onChange={(e) => set('season', e.target.value)}
            placeholder="2026"
          />
        </Field>
        <Field label="Franchise">
          <Select
            value={f.franchise}
            onChange={(e) => set('franchise', e.target.value)}
            options={franchiseOptions}
            placeholder="— none —"
          />
        </Field>
        <Field label="Player">
          <Select
            value={f.player}
            onChange={(e) => set('player', e.target.value)}
            options={playerOptions}
            placeholder="— none —"
          />
        </Field>
      </div>
      <Field label="Note">
        <Textarea value={f.note} onChange={(e) => set('note', e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <SubmitButton type="submit" pending={pending}>
          Create award
        </SubmitButton>
        <MiniButton type="button" onClick={onCancel}>
          Cancel
        </MiniButton>
      </div>
    </form>
  )
}

function AwardDeleteButton({
  id,
  title,
  onDone,
}: {
  id: number
  title: string
  onDone: () => void
}) {
  const [pending, start] = React.useTransition()
  return (
    <MiniButton
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
        start(async () => {
          const res = await deleteAward(id)
          if (res.ok) {
            toast.success('Award deleted')
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
