'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, ArrowRight, X } from '@phosphor-icons/react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, Select, MultiSelect, SubmitButton, MiniButton, type Option } from '@/components/commissioner/fields'
import { proposeTrade } from './actions'

export type PlayerLite = { id: string; name: string; ovr: number; franchise: string }

const MAX_PLAYERS = 3

export function ProposeTrade({
  franchiseOptions,
  players,
}: {
  franchiseOptions: Option[]
  players: PlayerLite[]
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="skeuo-btn rounded-lg px-4 py-2 text-sm font-semibold">Propose Trade</button>
      </DialogTrigger>
      {/* Transparent shell — the inner .glass-strong panel carries the frosted look,
          since `bg-*` utilities would otherwise override the component-layer glass.
          Capped to the viewport with a pinned header + scrollable body so the form
          stays reachable on short / mobile screens. */}
      <DialogContent
        showCloseButton={false}
        className="max-h-none overflow-y-visible border-0 !bg-transparent p-0 shadow-none sm:max-w-xl"
      >
        <div className="glass-strong flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl">
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
            <DialogTitle className="font-display text-lg font-black uppercase tracking-tight">
              Propose a trade
            </DialogTitle>
            <DialogClose
              aria-label="Close"
              className="rounded-lg p-1 text-foreground/60 transition-colors hover:text-foreground"
            >
              <X weight="bold" className="size-5" />
            </DialogClose>
          </DialogHeader>
          {/* Radix only mounts content while open, so the form resets between opens. */}
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5">
            <ProposeForm
              franchiseOptions={franchiseOptions}
              players={players}
              onDone={() => setOpen(false)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProposeForm({
  franchiseOptions,
  players,
  onDone,
}: {
  franchiseOptions: Option[]
  players: PlayerLite[]
  onDone: () => void
}) {
  const router = useRouter()
  const [fromFranchise, setFromFranchise] = React.useState('')
  const [toFranchise, setToFranchise] = React.useState('')
  const [offeredPlayers, setOfferedPlayers] = React.useState<string[]>([])
  const [requestedPlayers, setRequestedPlayers] = React.useState<string[]>([])
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

  // Drop any picked players that no longer belong to the chosen team.
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromFranchise) return toast.error('Pick a team to trade from')
    if (!toFranchise) return toast.error('Pick a team to trade to')
    if (fromFranchise === toFranchise) return toast.error('Teams must be different')
    if (offeredPlayers.length === 0 && requestedPlayers.length === 0)
      return toast.error('Add at least one player to the trade')
    start(async () => {
      const res = await proposeTrade({ fromFranchise, toFranchise, offeredPlayers, requestedPlayers })
      if (res.ok) {
        toast.success('Trade proposed')
        onDone()
        router.refresh()
      } else {
        toast.error(res.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-left">
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <Field label="From team">
          <Select
            value={fromFranchise}
            onChange={(e) => onFromChange(e.target.value)}
            options={franchiseOptions}
            placeholder="— select —"
          />
        </Field>
        <ArrowRight weight="bold" className="mb-2.5 hidden size-5 self-center text-primary sm:block" />
        <Field label="To team">
          <Select
            value={toFranchise}
            onChange={(e) => onToChange(e.target.value)}
            options={franchiseOptions}
            placeholder="— select —"
          />
        </Field>
      </div>

      <Field label={`Players offered (${offeredPlayers.length}/${MAX_PLAYERS})`} hint="From the 'from' team's roster">
        <MultiSelect
          options={offeredOptions}
          value={offeredPlayers}
          onChange={setOfferedPlayers}
          max={MAX_PLAYERS}
          empty={fromFranchise ? 'This team has no players' : 'Pick a team to trade from first'}
        />
      </Field>

      <Field label={`Players requested (${requestedPlayers.length}/${MAX_PLAYERS})`} hint="From the 'to' team's roster">
        <MultiSelect
          options={requestedOptions}
          value={requestedPlayers}
          onChange={setRequestedPlayers}
          max={MAX_PLAYERS}
          empty={toFranchise ? 'This team has no players' : 'Pick a team to trade to first'}
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <SubmitButton type="submit" pending={pending}>
          <Plus weight="bold" className="size-4" /> Propose trade
        </SubmitButton>
        <MiniButton type="button" onClick={onDone}>
          Cancel
        </MiniButton>
      </div>
    </form>
  )
}
