'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, Circle, Clock, Lock, Play } from '@phosphor-icons/react'
import { GlassPanel, EmptyState } from '@/components/ui-bits'
import { SubmitButton } from '@/components/commissioner/fields'
import { setRetention, startMainAuction, endAuction } from '@/app/(frontend)/auction/actions'
import { cn } from '@/lib/utils'

export type RetentionTeam = {
  id: string
  name: string
  color?: string | null
  retainedCount: number
  rosterCount: number
}
export type RosterPlayer = { id: string; name: string; ovr: number; position?: string | null; retained: boolean }

export function RetentionPhase({
  auctionId,
  retentionLimit,
  retentionDeadline,
  isCommish,
  myFranchiseName,
  myRoster,
  teams,
}: {
  auctionId: string
  retentionLimit: number
  retentionDeadline: string | null
  isCommish: boolean
  myFranchiseName: string | null
  myRoster: RosterPlayer[]
  teams: RetentionTeam[]
}) {
  const router = useRouter()
  const allReady = teams.length > 0 && teams.every((t) => t.retainedCount === retentionLimit)
  const deadlineLabel = retentionDeadline
    ? new Date(retentionDeadline).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <GlassPanel strong className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                <Clock weight="fill" size={13} /> Retention window
              </span>
              <h2 className="mt-3 font-display text-2xl font-black uppercase tracking-tight">
                Keep {retentionLimit}, release the rest
              </h2>
            </div>
            {deadlineLabel && (
              <p className="text-sm text-muted-foreground">
                Deadline <span className="font-semibold text-foreground">{deadlineLabel}</span>
              </p>
            )}
          </div>

          {myRoster.length > 0 ? (
            <OwnerPicker
              auctionId={auctionId}
              limit={retentionLimit}
              franchiseName={myFranchiseName}
              roster={myRoster}
              onSaved={() => router.refresh()}
            />
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              {isCommish
                ? 'You oversee retention as commissioner. Track each team below and start the auction once all are ready.'
                : 'Sign in as a team owner to choose which players to keep.'}
            </p>
          )}
        </GlassPanel>

        {isCommish && (
          <GlassPanel className="space-y-3 p-5">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
              <Play weight="bold" size={15} /> Start the auction
            </p>
            <p className="text-sm text-muted-foreground">
              {allReady
                ? 'Every team has retained their players. Starting will release everyone else, reset purses, and pool the free agents.'
                : 'Locked until every team has retained exactly ' + retentionLimit + ' players.'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <StartButton auctionId={auctionId} enabled={allReady} onDone={() => router.refresh()} />
              <CancelButton auctionId={auctionId} onDone={() => router.refresh()} />
            </div>
          </GlassPanel>
        )}
      </div>

      {/* Team progress rail */}
      <div className="space-y-3">
        <p className="px-1 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Retention progress
        </p>
        {teams.length === 0 ? (
          <EmptyState icon={Lock} title="No teams" description="Create franchises first." />
        ) : (
          teams.map((t) => {
            const ready = t.retainedCount === retentionLimit
            return (
              <div key={t.id} className={cn('skeuo rounded-xl p-3', ready && 'ring-1 ring-success/50')}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color || '#DF2604' }} />
                    {t.name}
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1 font-display text-sm font-bold',
                      ready ? 'text-success' : 'text-muted-foreground',
                    )}
                  >
                    {ready ? <CheckCircle weight="fill" size={15} /> : <Circle weight="bold" size={15} />}
                    {t.retainedCount}/{retentionLimit}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function OwnerPicker({
  auctionId,
  limit,
  franchiseName,
  roster,
  onSaved,
}: {
  auctionId: string
  limit: number
  franchiseName: string | null
  roster: RosterPlayer[]
  onSaved: () => void
}) {
  const [selected, setSelected] = React.useState<string[]>(
    roster.filter((p) => p.retained).map((p) => p.id),
  )
  const [pending, start] = React.useTransition()

  const toggle = (id: string) =>
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= limit) {
        toast.error(`You can only keep ${limit} players`)
        return prev
      }
      return [...prev, id]
    })

  const save = () =>
    start(async () => {
      const res = await setRetention({ auctionId, playerIds: selected })
      if (res.ok) {
        toast.success('Retention saved')
        onSaved()
      } else {
        toast.error(res.error ?? 'Failed to save')
      }
    })

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">
          {franchiseName ?? 'Your team'} ·{' '}
          <span className={cn(selected.length === limit ? 'text-success' : 'text-primary')}>
            {selected.length}/{limit} kept
          </span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {roster.map((p) => {
          const on = selected.includes(p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors',
                on ? 'skeuo-btn ring-2 ring-primary' : 'skeuo-inset hover:bg-foreground/5',
              )}
            >
              <span className="font-display text-lg font-black text-primary">{p.ovr}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold leading-tight">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.position}</span>
              </span>
              {on && <CheckCircle weight="fill" size={16} className="shrink-0 text-primary" />}
            </button>
          )
        })}
      </div>
      <div className="mt-4">
        <SubmitButton pending={pending} onClick={save}>
          Save retention
        </SubmitButton>
      </div>
    </div>
  )
}

function CancelButton({ auctionId, onDone }: { auctionId: string; onDone: () => void }) {
  const [pending, start] = React.useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm('Cancel this main auction? The retention window closes and nothing is released.')) return
        start(async () => {
          const res = await endAuction(auctionId)
          if (res.ok) {
            toast.success('Main auction cancelled')
            onDone()
          } else {
            toast.error(res.error ?? 'Failed')
          }
        })
      }}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
    >
      Cancel
    </button>
  )
}

function StartButton({
  auctionId,
  enabled,
  onDone,
}: {
  auctionId: string
  enabled: boolean
  onDone: () => void
}) {
  const [pending, start] = React.useTransition()
  return (
    <SubmitButton
      pending={pending}
      disabled={!enabled}
      onClick={() =>
        start(async () => {
          const res = await startMainAuction(auctionId)
          if (res.ok) {
            toast.success('Main auction is live!')
            onDone()
          } else {
            toast.error(res.error ?? 'Could not start')
          }
        })
      }
    >
      <Play weight="bold" size={16} /> Start Main Auction
    </SubmitButton>
  )
}
