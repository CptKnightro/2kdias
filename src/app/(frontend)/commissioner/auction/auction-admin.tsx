'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Gavel, ArrowSquareOut, Broom, Clock, Circle } from '@phosphor-icons/react'
import { GlassPanel } from '@/components/ui-bits'
import { AuctionSetup } from '@/components/auction/auction-setup'
import { clearAuction } from '@/app/(frontend)/auction/actions'
import { cn } from '@/lib/utils'

export type AuctionSummary = {
  id: string
  title: string
  kind: 'main' | 'mid'
  status: string
  retentionOpen: boolean
  resolvedCount: number
} | null

export function AuctionAdmin({
  latest,
  freeAgentCount,
}: {
  latest: AuctionSummary
  freeAgentCount: number
}) {
  const router = useRouter()
  const [pending, start] = React.useTransition()

  const isLive = latest?.status === 'live'
  const inRetention = !!latest && latest.kind === 'main' && latest.retentionOpen && latest.status !== 'ended'
  const isEnded = latest?.status === 'ended'
  const busy = isLive || inRetention
  const canClear = !!latest && !busy && latest.resolvedCount > 0

  const clear = () => {
    if (!latest) return
    if (
      !confirm(
        'Clear the auction board? This wipes the results recap from the public auction page. Team rosters and purses are kept.',
      )
    )
      return
    start(async () => {
      const res = await clearAuction(latest.id)
      if (res.ok) {
        toast.success('Auction board cleared')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Failed to clear')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Current auction status ─────────────────────────────── */}
      <GlassPanel strong className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="skeuo grid h-11 w-11 place-items-center rounded-xl text-primary">
            <Gavel weight="bold" size={22} />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Current auction</p>
            <div className="flex items-center gap-2">
              <p className="font-display text-xl font-black uppercase tracking-tight">
                {latest ? latest.title : 'None running'}
              </p>
              {latest && (
                <StatusBadge isLive={isLive} inRetention={inRetention} isEnded={isEnded} />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/auction"
            className="skeuo inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-primary"
          >
            Open room <ArrowSquareOut weight="bold" size={15} />
          </Link>
          {canClear && (
            <button
              onClick={clear}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              <Broom weight="bold" size={15} /> Clear board
            </button>
          )}
        </div>
      </GlassPanel>

      {/* ── Start / manage ─────────────────────────────────────── */}
      {busy ? (
        <GlassPanel className="space-y-4 p-5">
          <p className="text-sm text-muted-foreground">
            An auction is currently{' '}
            <span className="font-semibold text-foreground">
              {isLive ? 'live' : 'in its retention window'}
            </span>
            . Run it from the{' '}
            <Link href="/auction" className="font-semibold text-primary hover:underline">
              auction room
            </Link>
            . Starting a new one below will end the current one.
          </p>
          <div className="border-t border-foreground/10 pt-4">
            <AuctionSetup freeAgentCount={freeAgentCount} />
          </div>
        </GlassPanel>
      ) : (
        <AuctionSetup freeAgentCount={freeAgentCount} />
      )}
    </div>
  )
}

function StatusBadge({
  isLive,
  inRetention,
  isEnded,
}: {
  isLive: boolean
  inRetention: boolean
  isEnded: boolean
}) {
  if (isLive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
        <Circle weight="fill" size={9} className="animate-pulse" /> Live
      </span>
    )
  }
  if (inRetention) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-warning">
        <Clock weight="fill" size={11} /> Retention
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider',
        'bg-muted text-muted-foreground',
      )}
    >
      {isEnded ? 'Ended' : 'Scheduled'}
    </span>
  )
}
