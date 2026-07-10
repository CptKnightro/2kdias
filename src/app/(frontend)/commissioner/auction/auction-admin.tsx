'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Gavel, ArrowSquareOut, Broom, Trash, Clock, Circle } from '@phosphor-icons/react'
import { GlassPanel } from '@/components/ui-bits'
import { AuctionSetup } from '@/components/auction/auction-setup'
import { TeamWallets, type WalletTeam } from '@/components/auction/team-wallets'
import { AuctionRoom, type AuctionView, type AuctionFranchise } from '@/components/auction-room'
import { clearAuction, deleteAuction } from '@/app/(frontend)/auction/actions'
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
  walletTeams,
  currencySymbol,
  currencySuffix,
  liveView,
  liveFranchises,
}: {
  latest: AuctionSummary
  freeAgentCount: number
  walletTeams: WalletTeam[]
  currencySymbol: string
  currencySuffix: string
  liveView: AuctionView | null
  liveFranchises: AuctionFranchise[]
}) {
  const router = useRouter()
  const [pending, start] = React.useTransition()

  const isLive = latest?.status === 'live'
  const inRetention =
    !!latest && latest.kind === 'main' && latest.retentionOpen && latest.status !== 'ended'
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

  const del = () => {
    if (!latest) return
    if (
      !confirm(
        latest.kind === 'mid'
          ? 'Delete this mid auction? If no team has bought anyone, the +100 grant is removed from every team. If any purchase happened, the money stays. Bids are deleted.'
          : 'Delete this auction and its bids? Rosters and purses are kept.',
      )
    )
      return
    start(async () => {
      const res = await deleteAuction(latest.id)
      if (res.ok) {
        toast.success('Auction deleted')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Failed to delete')
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
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Current auction
            </p>
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
            target="_blank"
            className="skeuo inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-primary"
          >
            View public room <ArrowSquareOut weight="bold" size={15} />
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
          {latest && (
            <button
              onClick={del}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash weight="bold" size={15} /> Delete auction
            </button>
          )}
        </div>
      </GlassPanel>

      {liveView ? (
        /* ── Live: the commissioner runs the auction right here ─── */
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You&rsquo;re the auctioneer — put players up from the pool, then{' '}
            <span className="font-semibold text-foreground">Going once / twice / Hammer</span>.
            Bidding happens on each owner&rsquo;s device in the{' '}
            <Link
              href="/auction"
              target="_blank"
              className="font-semibold text-primary hover:underline"
            >
              public room
            </Link>
            .
          </p>
          <AuctionRoom
            auction={liveView}
            franchises={liveFranchises}
            me={null}
            variant="commissioner"
          />
        </div>
      ) : (
        /* ── Not live: set wallets, then start an auction ──────── */
        <>
          <TeamWallets
            teams={walletTeams}
            currencySymbol={currencySymbol}
            currencySuffix={currencySuffix}
          />

          {inRetention ? (
            <GlassPanel className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">
                A main auction is in its{' '}
                <span className="font-semibold text-foreground">retention window</span>. Owners pick
                who they keep in the{' '}
                <Link href="/auction" className="font-semibold text-primary hover:underline">
                  auction room
                </Link>
                ; the live auction starts once every team has. Starting a new one below ends this.
              </p>
              <div className="border-t border-foreground/10 pt-4">
                <AuctionSetup freeAgentCount={freeAgentCount} />
              </div>
            </GlassPanel>
          ) : (
            <AuctionSetup freeAgentCount={freeAgentCount} />
          )}
        </>
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
