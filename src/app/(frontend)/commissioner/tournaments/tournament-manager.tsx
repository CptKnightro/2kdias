'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, PencilSimple, Trash, Trophy, ArrowSquareOut } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui-bits'
import { Field, TextInput, MultiSelect, SubmitButton, MiniButton, type Option } from '@/components/commissioner/fields'
import { saveTournament, deleteTournament } from '../actions'

export type TournamentRow = {
  id: number
  name: string
  format: string
  status: string
  season: string
  participants: string[]
  description: string
  champion: string
}

const blankTournament = (): TournamentRow => ({
  id: 0,
  name: '',
  format: 'round-robin',
  status: 'upcoming',
  season: '',
  participants: [],
  description: '',
  champion: '',
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
          description="Create a tournament — give it a name and check who's playing. Game results get logged on the tournament's own page."
        />
      ) : (
        <ul className="space-y-2">
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
  const owners = tournament.participants.map(
    (id) => franchiseOptions.find((o) => o.value === id)?.label ?? '—',
  )

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-foreground/[0.02] px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="font-display text-lg font-black uppercase leading-tight tracking-tight">
          {tournament.name}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {owners.length ? owners.join(' · ') : 'No participants'}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Link
          href={`/tournaments/${tournament.id}`}
          title="View tournament"
          className="rounded-lg px-2.5 py-1.5 text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <ArrowSquareOut weight="bold" className="size-4" />
        </Link>
        <MiniButton onClick={onEdit}>
          <PencilSimple weight="bold" className="size-4" />
        </MiniButton>
        <DeleteTournamentButton id={tournament.id} name={tournament.name} onDone={onDone} />
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
  const [name, setName] = React.useState(initial.name)
  const [participants, setParticipants] = React.useState<string[]>(initial.participants)
  const [pending, start] = React.useTransition()
  const isNew = !initial.id

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Tournament name is required')
    if (participants.length < 2) return toast.error('Pick at least two participants')
    start(async () => {
      const res = await saveTournament({
        id: initial.id || undefined,
        name,
        participants,
        // Carried through unchanged — not surfaced in this simplified form.
        format: initial.format,
        status: initial.status,
        season: initial.season,
        description: initial.description,
        champion: initial.champion,
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
      <Field label="Tournament name">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Dais Cup" />
      </Field>
      <Field label="Who's participating?" hint="Check the owners playing in this tournament.">
        <MultiSelect
          options={franchiseOptions}
          value={participants}
          onChange={setParticipants}
          empty="No franchises yet"
        />
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
