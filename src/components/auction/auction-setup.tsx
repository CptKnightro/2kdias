'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Gavel, ArrowsClockwise, UsersThree, CaretLeft } from '@phosphor-icons/react'
import { GlassPanel } from '@/components/ui-bits'
import { Field, TextInput, SubmitButton } from '@/components/commissioner/fields'
import { createMainAuction, createMidAuction } from '@/app/(frontend)/auction/actions'

/**
 * Commissioner-only: choose and start a Main or Mid auction when none is live.
 */
export function AuctionSetup({ freeAgentCount }: { freeAgentCount: number }) {
  const router = useRouter()
  const [mode, setMode] = React.useState<'choose' | 'main' | 'mid'>('choose')
  const [title, setTitle] = React.useState('')
  const [deadline, setDeadline] = React.useState('')
  const [pending, start] = React.useTransition()

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn()
      if (res.ok) {
        toast.success(ok)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Failed')
      }
    })

  if (mode === 'choose') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No auction is running. Choose how to run the next one.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setMode('main')}
            className="skeuo group rounded-2xl p-6 text-left transition-transform hover:-translate-y-0.5"
          >
            <span className="skeuo-btn mb-4 grid h-12 w-12 place-items-center rounded-xl text-primary">
              <ArrowsClockwise weight="bold" size={24} />
            </span>
            <h3 className="font-display text-xl font-black uppercase tracking-tight">Main Auction</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              League reset — every team keeps 3, releases the rest, then the whole pool is
              re-auctioned. Opens a retention window first.
            </p>
          </button>

          <button
            onClick={() => setMode('mid')}
            className="skeuo group rounded-2xl p-6 text-left transition-transform hover:-translate-y-0.5"
          >
            <span className="skeuo-btn mb-4 grid h-12 w-12 place-items-center rounded-xl text-primary">
              <UsersThree weight="bold" size={24} />
            </span>
            <h3 className="font-display text-xl font-black uppercase tracking-tight">Mid Auction</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Top-up — auction only the free agents (players not on any team). Rosters stay as they
              are. {freeAgentCount} free agents available.
            </p>
          </button>
        </div>
      </div>
    )
  }

  return (
    <GlassPanel strong className="space-y-4 p-6">
      <button
        onClick={() => setMode('choose')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <CaretLeft weight="bold" size={14} /> Back
      </button>

      {mode === 'main' ? (
        <>
          <h3 className="font-display text-xl font-black uppercase tracking-tight">
            Open a Main Auction
          </h3>
          <p className="text-sm text-muted-foreground">
            This opens the retention window. Every owner keeps 3 players; the live auction can&rsquo;t
            start until all teams have. Purses fully reset (retained kept free).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <TextInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Season 2 Main Auction"
              />
            </Field>
            <Field label="Retention deadline" hint="Target cutoff shown to owners">
              <TextInput type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
          </div>
          <SubmitButton
            pending={pending}
            onClick={() => run(() => createMainAuction({ title, retentionDeadline: deadline }), 'Retention window open')}
          >
            <ArrowsClockwise weight="bold" size={16} /> Open retention window
          </SubmitButton>
        </>
      ) : (
        <>
          <h3 className="font-display text-xl font-black uppercase tracking-tight">
            Start a Mid Auction
          </h3>
          <p className="text-sm text-muted-foreground">
            Pools the <span className="font-semibold text-foreground">{freeAgentCount}</span> free
            agents (players not on a team) and goes live immediately.
          </p>
          <Field label="Title">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mid-Season Auction" />
          </Field>
          <SubmitButton
            pending={pending}
            disabled={freeAgentCount === 0}
            onClick={() => run(() => createMidAuction({ title }), 'Mid auction is live')}
          >
            <Gavel weight="bold" size={16} /> Start mid auction
          </SubmitButton>
        </>
      )}
    </GlassPanel>
  )
}
