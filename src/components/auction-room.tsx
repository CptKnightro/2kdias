'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Gavel,
  Timer,
  CurrencyCircleDollar,
  Trophy,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react'
import { PlayerCard, type PlayerCardData } from '@/components/player-card'
import { GlassPanel } from '@/components/ui-bits'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { placeBid, setLot, setLotStatus, sellLot, endAuction } from '@/app/(frontend)/auction/actions'
import { cn, formatCurrency } from '@/lib/utils'

export type AuctionFranchise = {
  id: string
  name: string
  color?: string | null
  purseTotal: number
  purseSpent: number
  rosterCount: number
}

export type AuctionView = {
  id: string
  status: string
  lotStatus: string
  currentHighBid: number | null
  minIncrement: number
  currencySymbol: string
  currencySuffix: string
  currentPlayer: (PlayerCardData & { id: string }) | null
  highFranchiseId: string | null
  highFranchiseName: string | null
  recentBids: { id: string; amount: number; franchiseName: string }[]
  queue: { id: string; name: string; ovr: number; position?: string | null }[]
}

export type Me = {
  userId: string
  role: 'commissioner' | 'owner'
  franchiseId: string | null
} | null

export function AuctionRoom({
  auction,
  franchises,
  me,
  canEnd,
}: {
  auction: AuctionView
  franchises: AuctionFranchise[]
  me: Me
  canEnd?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const sym = auction.currencySymbol || '$'
  const suf = auction.currencySuffix || 'M'
  const money = (n: number) => formatCurrency(n, sym, suf)

  // ── realtime: refresh on bid inserts / auction updates ──────────
  React.useEffect(() => {
    const supabase = getSupabaseBrowser()
    if (supabase) {
      const channel = supabase
        .channel(`auction-${auction.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () =>
          router.refresh(),
        )
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions' }, () =>
          router.refresh(),
        )
        .subscribe()
      return () => {
        supabase.removeChannel(channel)
      }
    }
    // fallback: poll every 4s if realtime isn't configured
    const t = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(t)
  }, [auction.id, router])

  const myFranchise = franchises.find((f) => f.id === me?.franchiseId)
  const canBid = me && (me.role === 'commissioner' || me.franchiseId)
  const isCommish = me?.role === 'commissioner'
  const lotOpen = ['open', 'going1', 'going2'].includes(auction.lotStatus)
  const high = auction.currentHighBid ?? 0
  const nextMin = auction.highFranchiseId ? high + auction.minIncrement : high

  const bid = (amount: number) => {
    const franchiseId = me?.franchiseId ?? myFranchise?.id
    if (!franchiseId) {
      toast.error('No franchise linked to your account.')
      return
    }
    startTransition(async () => {
      const res = await placeBid({ auctionId: auction.id, franchiseId, amount })
      if (res.ok) toast.success(`Bid ${money(amount)} placed`)
      else toast.error(res.error || 'Bid failed')
      router.refresh()
    })
  }

  const commish = (fn: () => Promise<{ ok: boolean; error?: string }>, label: string) =>
    startTransition(async () => {
      const res = await fn()
      if (res.ok) toast.success(label)
      else toast.error(res.error || 'Failed')
      router.refresh()
    })

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {/* ── Stage ──────────────────────────────────────────────── */}
      <div className="space-y-5">
        <GlassPanel strong className="relative overflow-hidden p-6">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          {auction.currentPlayer ? (
            <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className={cn('relative', lotOpen && 'animate-pulse-ring rounded-2xl')}>
                <PlayerCard player={auction.currentPlayer} size="lg" />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider',
                    auction.lotStatus === 'sold'
                      ? 'bg-success/20 text-success'
                      : auction.lotStatus === 'unsold'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary/15 text-primary',
                  )}
                >
                  <Gavel weight="fill" size={13} />
                  {auction.lotStatus === 'going1'
                    ? 'Going once'
                    : auction.lotStatus === 'going2'
                      ? 'Going twice'
                      : auction.lotStatus === 'sold'
                        ? 'Sold'
                        : auction.lotStatus === 'unsold'
                          ? 'Unsold'
                          : 'On the block'}
                </span>

                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Current Bid
                  </p>
                  <p className="font-display text-6xl font-black text-primary">
                    {money(high)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {auction.highFranchiseName ? (
                      <>
                        <Trophy weight="fill" size={13} className="mb-0.5 mr-1 inline text-warning" />
                        {auction.highFranchiseName}
                      </>
                    ) : (
                      'No bids yet'
                    )}
                  </p>
                </div>

                {/* Bid controls */}
                {canBid && lotOpen && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[nextMin, nextMin + 5, nextMin + 10].map((amt, i) => (
                      <button
                        key={i}
                        disabled={pending}
                        onClick={() => bid(amt)}
                        className="skeuo-btn rounded-xl px-5 py-3 font-display text-lg font-bold disabled:opacity-50"
                      >
                        {money(amt)}
                      </button>
                    ))}
                  </div>
                )}
                {!me && (
                  <p className="mt-5 text-sm text-muted-foreground">
                    Sign in at <span className="font-semibold">/admin</span> to bid.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Gavel weight="bold" size={40} className="text-muted-foreground" />
              <p className="font-display text-xl font-bold">No lot on the block</p>
              <p className="text-sm text-muted-foreground">
                {isCommish
                  ? 'Pick a player from the queue to start bidding.'
                  : 'Waiting for the commissioner to put up the next player.'}
              </p>
            </div>
          )}
        </GlassPanel>

        {/* Commissioner controls */}
        {isCommish && (
          <GlassPanel className="p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
              <Gavel weight="bold" size={15} /> Auctioneer Controls
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => commish(() => setLotStatus(auction.id, 'going1'), 'Going once')}
                disabled={pending || !auction.currentPlayer}
                className="skeuo rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Going once
              </button>
              <button
                onClick={() => commish(() => setLotStatus(auction.id, 'going2'), 'Going twice')}
                disabled={pending || !auction.currentPlayer}
                className="skeuo rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Going twice
              </button>
              <button
                onClick={() => commish(() => sellLot(auction.id), 'Lot hammered')}
                disabled={pending || !auction.currentPlayer}
                className="skeuo-btn flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                <CheckCircle weight="bold" size={15} /> Sell / Hammer
              </button>
              {canEnd && (
                <button
                  onClick={() => {
                    if (!confirm('End this auction? You can then start a new Main or Mid auction.')) return
                    commish(() => endAuction(auction.id), 'Auction ended')
                  }}
                  disabled={pending}
                  className="ml-auto rounded-lg px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
                >
                  <XCircle weight="bold" size={15} className="mr-1 inline" /> End auction
                </button>
              )}
            </div>
            {auction.queue.length > 0 && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Up next ({auction.queue.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {auction.queue.slice(0, 12).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => commish(() => setLot(auction.id, p.id), `${p.name} on the block`)}
                      disabled={pending}
                      className="skeuo rounded-lg px-2.5 py-1.5 text-xs font-medium hover:text-primary disabled:opacity-40"
                    >
                      {p.name} · {p.ovr}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </GlassPanel>
        )}

        {/* Live bid feed */}
        <GlassPanel className="p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Timer weight="bold" size={15} className="text-primary" /> Live Feed
          </p>
          {auction.recentBids.length > 0 ? (
            <ul className="space-y-1.5">
              {auction.recentBids.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-lg bg-foreground/5 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{b.franchiseName}</span>
                  <span className="font-display font-bold text-primary">
                    {money(b.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No bids yet.</p>
          )}
        </GlassPanel>
      </div>

      {/* ── Purse rail ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <CurrencyCircleDollar weight="bold" size={16} /> Purses
        </p>
        {franchises.map((f) => {
          const remaining = f.purseTotal - f.purseSpent
          const pct = f.purseTotal > 0 ? (remaining / f.purseTotal) * 100 : 0
          const isMe = f.id === me?.franchiseId
          const isHigh = f.id === auction.highFranchiseId
          return (
            <div
              key={f.id}
              className={cn(
                'skeuo rounded-xl p-3',
                isHigh && 'ring-2 ring-primary',
                isMe && 'ring-1 ring-foreground/30',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: f.color || '#DF2604' }}
                  />
                  {f.name}
                  {isMe && <span className="text-[10px] text-muted-foreground">(you)</span>}
                </span>
                <span className="font-display text-sm font-bold">
                  {money(remaining)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: f.color || 'var(--primary)',
                  }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {f.rosterCount} players · {money(f.purseSpent)} spent
              </p>
            </div>
          )
        })}
        {franchises.length === 0 && (
          <GlassPanel className="p-4 text-center text-sm text-muted-foreground">
            <XCircle weight="bold" size={20} className="mx-auto mb-1 text-muted-foreground" />
            No franchises yet. Create them in the admin.
          </GlassPanel>
        )}
      </div>
    </div>
  )
}
