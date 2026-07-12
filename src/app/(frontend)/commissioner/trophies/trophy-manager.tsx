'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Crown, Medal, Plus, Trash, Trophy as TrophyIcon } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui-bits'
import {
  Field,
  TextInput,
  Textarea,
  Select,
  SubmitButton,
  MiniButton,
  type Option,
} from '@/components/commissioner/fields'
import { saveTrophy, deleteTrophy, addTrophyWinner, removeTrophyWinner } from '../actions'

export type ManagedTrophy = {
  id: number
  name: string
  kind: 'recurring' | 'final'
  description: string | null
  winners: { id: string; name: string; season: string | null }[]
}

const KIND_OPTIONS: Option[] = [
  { label: 'Recurring — every winner keeps their ring', value: 'recurring' },
  { label: 'Final — one winner holds it', value: 'final' },
]

export function TrophyManager({
  trophies,
  franchiseOptions,
}: {
  trophies: ManagedTrophy[]
  franchiseOptions: Option[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = React.useState(trophies.length === 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {trophies.length} troph{trophies.length === 1 ? 'y' : 'ies'}
        </p>
        {!showForm && (
          <SubmitButton onClick={() => setShowForm(true)}>
            <Plus weight="bold" className="size-4" /> Create a trophy
          </SubmitButton>
        )}
      </div>

      {showForm && <TrophyForm onDone={() => router.refresh()} />}

      {trophies.length === 0 ? (
        <EmptyState
          icon={TrophyIcon}
          title="No trophies yet"
          description="Create a trophy above, then hand out rings to the winners."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {trophies.map((t) => (
            <TrophyCard
              key={t.id}
              trophy={t}
              franchiseOptions={franchiseOptions}
              onDone={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TrophyForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = React.useState('')
  const [kind, setKind] = React.useState('recurring')
  const [description, setDescription] = React.useState('')
  const [pending, setPending] = React.useState(false)

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Give the trophy a name')
      return
    }
    setPending(true)
    const res = await saveTrophy({ name: name.trim(), kind, description })
    setPending(false)
    if (res.ok) {
      toast.success(`“${name.trim()}” created`)
      setName('')
      setDescription('')
      setKind('recurring')
      onDone()
    } else {
      toast.error(res.error ?? 'Could not create trophy')
    }
  }

  return (
    <div className="glass space-y-4 rounded-2xl p-4">
      <h2 className="font-display text-lg font-black uppercase tracking-tight">Create a trophy</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. OG Tournament Ring"
          />
        </Field>
        <Field
          label="Type"
          hint={
            kind === 'final'
              ? 'Shows a single winner — awarding it again replaces the holder.'
              : 'Shows everyone who has won it, ring by ring.'
          }
        >
          <Select value={kind} onChange={(e) => setKind(e.target.value)} options={KIND_OPTIONS} />
        </Field>
      </div>
      <Field label="Description (optional)">
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this trophy for?"
        />
      </Field>
      <SubmitButton pending={pending} onClick={submit}>
        <Plus weight="bold" className="size-4" /> Create trophy
      </SubmitButton>
    </div>
  )
}

function TrophyCard({
  trophy,
  franchiseOptions,
  onDone,
}: {
  trophy: ManagedTrophy
  franchiseOptions: Option[]
  onDone: () => void
}) {
  const isFinal = trophy.kind === 'final'
  const [franchise, setFranchise] = React.useState('')
  const [season, setSeason] = React.useState('')
  const [pending, setPending] = React.useState(false)

  const award = async () => {
    if (!franchise) {
      toast.error('Pick a team')
      return
    }
    setPending(true)
    const res = await addTrophyWinner({ trophyId: trophy.id, franchise, season })
    setPending(false)
    if (res.ok) {
      toast.success(isFinal ? 'Winner crowned' : 'Ring handed out')
      setFranchise('')
      setSeason('')
      onDone()
    } else {
      toast.error(res.error ?? 'Could not award trophy')
    }
  }

  const removeWinner = async (winnerId: string) => {
    const res = await removeTrophyWinner({ trophyId: trophy.id, winnerId })
    if (res.ok) {
      toast.success('Winner removed')
      onDone()
    } else {
      toast.error(res.error ?? 'Could not remove winner')
    }
  }

  const remove = async () => {
    if (!window.confirm(`Delete “${trophy.name}” and all its winners?`)) return
    const res = await deleteTrophy(trophy.id)
    if (res.ok) {
      toast.success('Trophy deleted')
      onDone()
    } else {
      toast.error(res.error ?? 'Could not delete trophy')
    }
  }

  return (
    <div className="glass space-y-3 rounded-2xl p-4">
      <div className="flex items-start gap-2.5">
        <span className="skeuo grid h-9 w-9 shrink-0 place-items-center rounded-lg text-warning">
          {isFinal ? <Crown weight="fill" size={18} /> : <TrophyIcon weight="fill" size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-black uppercase leading-tight tracking-tight">
            {trophy.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isFinal ? 'Final — one winner' : 'Recurring — multiple winners'}
          </p>
        </div>
        <MiniButton variant="danger" onClick={remove} aria-label={`Delete ${trophy.name}`}>
          <Trash weight="bold" className="size-4" />
        </MiniButton>
      </div>

      {trophy.winners.length > 0 ? (
        <ul className="space-y-1.5">
          {trophy.winners.map((w) => (
            <li key={w.id} className="skeuo-inset flex items-center gap-2.5 rounded-xl px-3 py-2">
              <Medal weight="fill" size={16} className="shrink-0 text-warning" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{w.name}</span>
              {w.season && <span className="shrink-0 text-xs text-muted-foreground">{w.season}</span>}
              <MiniButton
                variant="danger"
                onClick={() => removeWinner(w.id)}
                aria-label={`Remove ${w.name}`}
              >
                <Trash weight="bold" className="size-3.5" />
              </MiniButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="skeuo-inset rounded-xl p-3 text-center text-xs text-muted-foreground">
          {isFinal ? 'Not yet awarded.' : 'No rings handed out yet.'}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <Field label={isFinal ? 'Winner' : 'Add winner'} className="min-w-40 flex-1">
          <Select
            value={franchise}
            onChange={(e) => setFranchise(e.target.value)}
            options={franchiseOptions}
            placeholder="Pick a team…"
          />
        </Field>
        <Field label="Season" className="w-28">
          <TextInput
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="S1, 2026…"
          />
        </Field>
        <SubmitButton pending={pending} onClick={award}>
          {isFinal && trophy.winners.length > 0 ? 'Replace winner' : isFinal ? 'Crown winner' : 'Award ring'}
        </SubmitButton>
      </div>
    </div>
  )
}
