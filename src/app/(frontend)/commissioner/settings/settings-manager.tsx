'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash, Crown, User as UserIcon } from '@phosphor-icons/react'
import {
  Field,
  TextInput,
  Select,
  SubmitButton,
  MiniButton,
  type Option,
} from '@/components/commissioner/fields'
import { LogoutButton } from '@/components/commissioner/logout-button'
import { createUser, updateUserRole, deleteUser } from '../actions'

export type UserRow = {
  id: number
  name: string
  email: string
  role: 'commissioner' | 'owner'
  franchise: string
}

const ROLE_OPTIONS: Option[] = [
  { label: 'Commissioner', value: 'commissioner' },
  { label: 'Team owner', value: 'owner' },
]

export function SettingsManager({
  users,
  franchises,
  meId,
  version,
}: {
  users: UserRow[]
  franchises: Option[]
  meId: number
  version: string
}) {
  const router = useRouter()
  return (
    <div className="space-y-8">
      <NewUserForm franchises={franchises} onDone={() => router.refresh()} />

      <section className="space-y-3">
        <h2 className="font-display text-xl font-black uppercase tracking-tight">
          Users ({users.length})
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 bg-foreground/[0.02] px-4 py-3">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                  u.role === 'commissioner' ? 'skeuo-btn text-primary' : 'skeuo text-foreground/70'
                }`}
              >
                {u.role === 'commissioner' ? (
                  <Crown weight="bold" size={18} />
                ) : (
                  <UserIcon weight="bold" size={18} />
                )}
              </span>
              <div className="min-w-0">
                <div className="font-semibold leading-tight">
                  {u.name}
                  {u.id === meId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </div>
                <div className="truncate text-xs text-muted-foreground">{u.email}</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <RoleSelect user={u} disabled={u.id === meId} onDone={() => router.refresh()} />
                <DeleteUserButton
                  id={u.id}
                  name={u.name}
                  disabled={u.id === meId}
                  onDone={() => router.refresh()}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-black uppercase tracking-tight">About</h2>
        <div className="glass flex flex-wrap items-center gap-4 rounded-2xl p-4">
          <div>
            <div className="font-display text-lg font-black uppercase leading-tight tracking-tight">
              2KDais
            </div>
            <div className="text-xs text-muted-foreground">
              Version <span className="font-mono text-foreground">{version}</span>
            </div>
          </div>
          <div className="ml-auto">
            <LogoutButton />
          </div>
        </div>
      </section>
    </div>
  )
}

function NewUserForm({ franchises, onDone }: { franchises: Option[]; onDone: () => void }) {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [role, setRole] = React.useState('owner')
  const [franchise, setFranchise] = React.useState('')
  const [pending, start] = React.useTransition()

  const reset = () => {
    setName('')
    setEmail('')
    setPassword('')
    setRole('owner')
    setFranchise('')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Name is required')
    if (!email.trim()) return toast.error('Email is required')
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    start(async () => {
      const res = await createUser({ name, email, password, role, franchise: role === 'owner' ? franchise : '' })
      if (res.ok) {
        toast.success('User created')
        reset()
        onDone()
      } else {
        toast.error(res.error ?? 'Could not create user')
      }
    })
  }

  return (
    <form onSubmit={submit} className="glass-strong space-y-4 rounded-2xl p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-black uppercase tracking-tight">
        <Plus weight="bold" size={20} className="text-primary" /> Add user
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Player name" />
        </Field>
        <Field label="Email">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@2kdais.local"
          />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <TextInput
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Set a starting password"
          />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value)} options={ROLE_OPTIONS} />
        </Field>
        {role === 'owner' && (
          <Field label="Team" hint="The franchise this owner controls">
            <Select
              value={franchise}
              onChange={(e) => setFranchise(e.target.value)}
              options={franchises}
              placeholder="— none —"
            />
          </Field>
        )}
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton type="submit" pending={pending}>
          Create user
        </SubmitButton>
        <p className="text-xs text-muted-foreground">
          {role === 'commissioner'
            ? 'Commissioners can access this dashboard.'
            : 'Team owners can sign in but not access the commissioner area.'}
        </p>
      </div>
    </form>
  )
}

function RoleSelect({
  user,
  disabled,
  onDone,
}: {
  user: UserRow
  disabled?: boolean
  onDone: () => void
}) {
  const [pending, start] = React.useTransition()
  return (
    <Select
      className="w-36"
      value={user.role}
      disabled={disabled || pending}
      options={ROLE_OPTIONS}
      onChange={(e) => {
        const role = e.target.value
        start(async () => {
          const res = await updateUserRole(user.id, role)
          if (res.ok) {
            toast.success(`${user.name} is now ${role === 'commissioner' ? 'a commissioner' : 'a team owner'}`)
            onDone()
          } else {
            toast.error(res.error ?? 'Could not update role')
          }
        })
      }}
    />
  )
}

function DeleteUserButton({
  id,
  name,
  disabled,
  onDone,
}: {
  id: number
  name: string
  disabled?: boolean
  onDone: () => void
}) {
  const [pending, start] = React.useTransition()
  return (
    <MiniButton
      variant="danger"
      disabled={disabled || pending}
      onClick={() => {
        if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
        start(async () => {
          const res = await deleteUser(id)
          if (res.ok) {
            toast.success('User deleted')
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
