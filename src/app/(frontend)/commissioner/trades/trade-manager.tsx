'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash, ArrowsLeftRight } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui-bits'
import {
  Field,
  NumberInput,
  Textarea,
  Select,
  MultiSelect,
  SubmitButton,
  MiniButton,
  type Option,
} from '@/components/commissioner/fields'
import { createTrade, updateTradeStatus, deleteTrade } from '../actions'

export type PlayerLite = {
  id: string
  name: string
  ovr: number
  franchise: string
}

export type TradeRow = {
  id: number
  fromName: string
  toName: string
  status: string
  offeredPlayerNames: string[]
  requestedPlayerNames: string[]
  cashAdjustment: number
  note: string
  createdAt: string
}

const STATUS_OPTIONS: Option[] = [
  { label: 'Proposed', value: 'proposed' },
  { label: 'Countered', value: 'countered' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Vetoed', value: 'vetoed' },
]

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label]),
)

function statusClasses(status: string): string {
  switch (status) {
    case 'accepted':
      return 'bg-emerald-500/15 text-emerald-400'
    case 'rejected':
    case 'vetoed':
      return 'bg-destructive/15 text-destructive'
    case 'countered':
      return 'bg-amber-500/15 text-amber-400'
    default:
      return 'bg-foreground/10 text-foreground/70'
  }
}

export function TradeManager({
  franchiseOptions,
  players,
  trades,
}: {
  franchiseOptions: Option[]
  players: PlayerLite[]
  trades: TradeRow[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = React.useState(true)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{trades.length} trades</p>
        {!showForm && (
          <SubmitButton onClick={() => setShowForm(true)}>
            <Plus weight="bold" className="size-4" /> Record a trade
          </SubmitButton>
        )}
      </div>

      {showForm && (
        <TradeForm
          franchiseOptions={franchiseOptions}
          players={players}
          onDone={() => router.refresh()}
        />
      )}

      {trades.length === 0 ? (
        <EmptyState
          icon={ArrowsLeftRight}
          title="No trades yet"
          description="Record a trade between two franchises to get started."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {trades.map((t) => (
            <TradeListItem key={t.id} trade={t} onDone={() => router.refresh()} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TradeForm({
  franchiseOptions,
  players,
  onDone,
}: {
  franchiseOptions: Option[]
  players: PlayerLite[]
  onDone: () => void
}) {
  const [fromFranchise, setFromFranchise] = React.useState('')
  const [toFranchise, setToFranchise] = React.useState('')
  const [offeredPlayers, setOfferedPlayers] = React.useState<string[]>([])
  const [requestedPlayers, setRequestedPlayers] = React.useState<string[]>([])
  const [cashAdjustment, setCashAdjustment] = React.useState(0)
  const [note, setNote] = React.useState('')
  const [status, setStatus] = React.useState('proposed')
  const [pending, start] = React.useTransition()

  const toOption = (p: PlayerLite): Option => ({ label: `${p.name} · ${p.ovr}`, value: p.id })

  const offeredOptions = React.useMemo(
    () => (fromFranchise ? players.filter((p) => p.franchise === fromFranchise).map(toOption) : []),
    [fromFranchise, players],
  )
  const requestedOptions = React.useMemo(
    () => (toFranchise ? players.filter((p) => p.franchise === toFranchise).map(toOption) : []),
    [toFranchise, players],
  )

  // Drop any selected players that no longer belong to the chosen team.
  const onFromChange = (v: string) => {
    setFromFranchise(v)
    const valid = new Set(players.filter((p) => p.franchise === v).map((p) => p.id))
    setOfferedPlayers((prev) => prev.filter((id) => valid.has(id)))
  }
  const onToChange = (v: string) => {
    setToFranchise(v)
    const valid = new Set(players.filter((p) => p.franchise === v).map((p) => p.id))
    setRequestedPlayers((prev) => prev.filter((id) => valid.has(id)))
  }

  const reset = () => {
    setFromFranchise('')
    setToFranchise('')
    setOfferedPlayers([])
    setRequestedPlayers([])
    setCashAdjustment(0)
    setNote('')
    setStatus('proposed')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromFranchise) return toast.error("Pick a 'from' team")
    if (!toFranchise) return toast.error("Pick a 'to' team")
    if (fromFranchise === toFranchise) return toast.error('Teams must be different')
    start(async () => {
      const res = await createTrade({
        fromFranchise,
        toFranchise,
        offeredPlayers,
        requestedPlayers,
        cashAdjustment: String(cashAdjustment),
        note,
        status,
      })
      if (res.ok) {
        toast.success('Trade recorded')
        reset()
        onDone()
      } else {
        toast.error(res.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={submit} className="glass-strong space-y-4 rounded-2xl p-5">
      <h3 className="font-display text-lg font-black uppercase tracking-tight">Record a trade</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From team">
          <Select
            value={fromFranchise}
            onChange={(e) => onFromChange(e.target.value)}
            options={franchiseOptions}
            placeholder="— select —"
          />
        </Field>
        <Field label="To team">
          <Select
            value={toFranchise}
            onChange={(e) => onToChange(e.target.value)}
            options={franchiseOptions}
            placeholder="— select —"
          />
        </Field>
      </div>

      <Field label="Players offered" hint="From the 'from' team's roster">
        <MultiSelect
          options={offeredOptions}
          value={offeredPlayers}
          onChange={setOfferedPlayers}
          empty={fromFranchise ? 'This team has no players' : "Pick a 'from' team first"}
        />
      </Field>

      <Field label="Players requested" hint="From the 'to' team's roster">
        <MultiSelect
          options={requestedOptions}
          value={requestedPlayers}
          onChange={setRequestedPlayers}
          empty={toFranchise ? 'This team has no players' : "Pick a 'to' team first"}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cash adjustment" hint="currency from → to (negative = other way)">
          <NumberInput
            value={cashAdjustment}
            onChange={(e) => setCashAdjustment(Number(e.target.value))}
          />
        </Field>
        <Field label="Status">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_OPTIONS}
          />
        </Field>
      </div>

      <Field label="Note">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="flex gap-2">
        <SubmitButton type="submit" pending={pending}>
          Record trade
        </SubmitButton>
        <MiniButton type="button" onClick={reset}>
          Reset
        </MiniButton>
      </div>
    </form>
  )
}

function TradeListItem({ trade, onDone }: { trade: TradeRow; onDone: () => void }) {
  const [pending, start] = React.useTransition()

  const changeStatus = (status: string) => {
    if (status === trade.status) return
    start(async () => {
      const res = await updateTradeStatus(trade.id, status)
      if (res.ok) {
        toast.success('Status updated')
        onDone()
      } else {
        toast.error(res.error ?? 'Update failed')
      }
    })
  }

  const offered = trade.offeredPlayerNames.length ? trade.offeredPlayerNames.join(', ') : '—'
  const requested = trade.requestedPlayerNames.length ? trade.requestedPlayerNames.join(', ') : '—'

  return (
    <li className="space-y-2 bg-foreground/[0.02] px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="font-display text-lg font-black uppercase leading-tight tracking-tight">
          {trade.fromName} <ArrowsLeftRight weight="bold" className="inline size-4 text-primary" />{' '}
          {trade.toName}
        </div>
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses(
            trade.status,
          )}`}
        >
          {STATUS_LABEL[trade.status] ?? trade.status}
        </span>
      </div>

      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <span className="font-semibold text-foreground/70">Offered:</span> {offered}
        </div>
        <div>
          <span className="font-semibold text-foreground/70">Requested:</span> {requested}
        </div>
      </div>

      {trade.cashAdjustment !== 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/70">Cash:</span> {trade.cashAdjustment}
        </div>
      )}

      {trade.note && <p className="text-xs text-muted-foreground">{trade.note}</p>}

      <div className="flex items-center gap-2">
        <div className="w-40">
          <Select
            value={trade.status}
            onChange={(e) => changeStatus(e.target.value)}
            options={STATUS_OPTIONS}
            disabled={pending}
          />
        </div>
        <DeleteButton id={trade.id} onDone={onDone} />
      </div>
    </li>
  )
}

function DeleteButton({ id, onDone }: { id: number; onDone: () => void }) {
  const [pending, start] = React.useTransition()
  return (
    <MiniButton
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm('Delete this trade? This cannot be undone.')) return
        start(async () => {
          const res = await deleteTrade(id)
          if (res.ok) {
            toast.success('Trade deleted')
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
