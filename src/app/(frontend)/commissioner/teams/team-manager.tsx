'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, PencilSimple, Trash } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui-bits'
import { Users as UsersIcon } from '@phosphor-icons/react'
import {
  Field,
  TextInput,
  NumberInput,
  Textarea,
  Select,
  ColorInput,
  SubmitButton,
  MiniButton,
  type Option,
} from '@/components/commissioner/fields'
import { saveFranchise, deleteFranchise } from '../actions'

export type TeamRow = {
  id: number
  name: string
  slug: string
  color: string
  owner: string
  purseTotal: number
  purseSpent: number
  established: number | null
  bio: string
}

const blank = (): TeamRow => ({
  id: 0,
  name: '',
  slug: '',
  color: '#DF2604',
  owner: '',
  purseTotal: 100,
  purseSpent: 0,
  established: null,
  bio: '',
})

export function TeamManager({ teams, owners }: { teams: TeamRow[]; owners: Option[] }) {
  const router = useRouter()
  const [editing, setEditing] = React.useState<TeamRow | null>(null)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{teams.length} teams</p>
        {!editing && (
          <SubmitButton onClick={() => setEditing(blank())}>
            <Plus weight="bold" className="size-4" /> New team
          </SubmitButton>
        )}
      </div>

      {editing && (
        <TeamForm
          key={editing.id}
          initial={editing}
          owners={owners}
          onDone={() => {
            setEditing(null)
            router.refresh()
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {teams.length === 0 && !editing ? (
        <EmptyState
          icon={UsersIcon}
          title="No teams yet"
          description="Create your first franchise to get started."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {teams.map((t) => (
            <li key={t.id} className="flex items-center gap-3 bg-foreground/[0.02] px-4 py-3">
              <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: t.color }} />
              <div className="min-w-0">
                <div className="font-display text-lg font-black uppercase leading-tight tracking-tight">
                  {t.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {owners.find((o) => o.value === t.owner)?.label ?? 'No owner'} · purse{' '}
                  {t.purseTotal - t.purseSpent}/{t.purseTotal}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <MiniButton onClick={() => setEditing(t)}>
                  <PencilSimple weight="bold" className="size-4" />
                </MiniButton>
                <DeleteButton id={t.id} name={t.name} onDone={() => router.refresh()} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TeamForm({
  initial,
  owners,
  onDone,
  onCancel,
}: {
  initial: TeamRow
  owners: Option[]
  onDone: () => void
  onCancel: () => void
}) {
  const [f, setF] = React.useState(initial)
  const [pending, start] = React.useTransition()
  const isNew = !initial.id
  const set = <K extends keyof TeamRow>(k: K, v: TeamRow[K]) => setF((p) => ({ ...p, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return toast.error('Team name is required')
    start(async () => {
      const res = await saveFranchise({
        id: f.id || undefined,
        name: f.name,
        slug: f.slug,
        color: f.color,
        owner: f.owner,
        purseTotal: String(f.purseTotal),
        established: f.established == null ? '' : String(f.established),
        bio: f.bio,
      })
      if (res.ok) {
        toast.success(isNew ? 'Team created' : 'Team updated')
        onDone()
      } else {
        toast.error(res.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={submit} className="glass-strong space-y-4 rounded-2xl p-5">
      <h3 className="font-display text-lg font-black uppercase tracking-tight">
        {isNew ? 'New team' : `Edit ${initial.name}`}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <TextInput value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Dais Dynasty" />
        </Field>
        <Field label="URL handle" hint="Leave blank to auto-generate from name">
          <TextInput value={f.slug} onChange={(e) => set('slug', e.target.value)} placeholder="dais-dynasty" />
        </Field>
        <Field label="Accent color">
          <ColorInput value={f.color} onChange={(v) => set('color', v)} />
        </Field>
        <Field label="Owner">
          <Select
            value={f.owner}
            onChange={(e) => set('owner', e.target.value)}
            options={owners}
            placeholder="— none —"
          />
        </Field>
        <Field label="Purse total">
          <NumberInput value={f.purseTotal} onChange={(e) => set('purseTotal', Number(e.target.value))} />
        </Field>
        <Field label="Established (season)">
          <NumberInput
            value={f.established ?? ''}
            onChange={(e) => set('established', e.target.value === '' ? null : Number(e.target.value))}
          />
        </Field>
      </div>
      <Field label="Bio">
        <Textarea value={f.bio} onChange={(e) => set('bio', e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <SubmitButton type="submit" pending={pending}>
          {isNew ? 'Create team' : 'Save changes'}
        </SubmitButton>
        <MiniButton type="button" onClick={onCancel}>
          Cancel
        </MiniButton>
      </div>
    </form>
  )
}

function DeleteButton({ id, name, onDone }: { id: number; name: string; onDone: () => void }) {
  const [pending, start] = React.useTransition()
  return (
    <MiniButton
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
        start(async () => {
          const res = await deleteFranchise(id)
          if (res.ok) {
            toast.success('Team deleted')
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
