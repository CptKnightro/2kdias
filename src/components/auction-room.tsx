'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  Gavel,
  Timer,
  CurrencyCircleDollar,
  Trophy,
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  Lightning,
  Stack,
  ClockCountdown,
  SignIn,
  UsersThree,
} from '@phosphor-icons/react'
import { PlayerCard, type PlayerCardData } from '@/components/player-card'
import { GlassPanel } from '@/components/ui-bits'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import {
  placeBid,
  setLot,
  setLotStatus,
  sellLot,
  endAuction,
} from '@/app/(frontend)/auction/actions'
import { cn, formatCurrency } from '@/lib/utils'

export type AuctionFranchise = {
  id: string
  name: string
  color?: string | null
  purseTotal: number
  purseSpent: number
  rosterCount: number
}

export type PoolPlayer = { id: string; name: string; ovr: number; position?: string | null }
export type HistoryPlayer = PoolPlayer & {
  result: 'sold' | 'unsold'
  franchiseName?: string | null
  color?: string | null
  price?: number | null
}

export type AuctionView = {
  id: string
  kind: 'main' | 'mid'
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
  pool: PoolPlayer[] // available players, in queue order (commissioner free-picks from here)
  history: HistoryPlayer[] // resolved lots — sold / passed, newest first
}

export type Me = {
  userId: string
  role: 'commissioner' | 'owner'
  franchiseId: string | null
} | null

const AUTO_PICK_SECONDS = 8
const ON_DECK = 3

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
  const reduce = useReducedMotion()
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
    const t = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(t)
  }, [auction.id, router])

  const isCommish = me?.role === 'commissioner'
  const lotOpen = ['open', 'going1', 'going2'].includes(auction.lotStatus)
  const blockFree = !lotOpen // idle / sold / unsold → ready for the next lot
  const high = auction.currentHighBid ?? 0
  const nextMin = auction.highFranchiseId ? high + auction.minIncrement : high

  const pool = auction.pool
  const upNext = pool.slice(0, ON_DECK)
  const nextUpId = upNext[0]?.id ?? null

  // ── Bidder identity (login-free) ────────────────────────────────────────
  // A signed-in owner is pinned to their own team. Everyone else taps "Sign in"
  // and picks which team they're bidding for; the choice is saved per-auction
  // so a refresh (or a realtime re-render) keeps their seat.
  const linkedFid = me?.franchiseId ?? null
  const storageKey = `2kdais:auction:${auction.id}:team`
  const [pickedFid, setPickedFid] = React.useState<string | null>(null)
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (saved) setPickedFid(saved)
    } catch {
      /* localStorage unavailable — fall back to in-memory pick */
    }
  }, [storageKey])
  const choose = (fid: string | null) => {
    setPickedFid(fid)
    try {
      if (fid) window.localStorage.setItem(storageKey, fid)
      else window.localStorage.removeItem(storageKey)
    } catch {
      /* ignore */
    }
  }
  // Only honor a pick that still maps to a live team.
  const actingFranchise = franchises.find((f) => f.id === (linkedFid ?? pickedFid)) ?? null
  const effectiveFid = actingFranchise?.id ?? null

  const bid = (amount: number) => {
    if (!effectiveFid) {
      toast.error('Pick a team to bid for first.')
      return
    }
    startTransition(async () => {
      const res = await placeBid({ auctionId: auction.id, franchiseId: effectiveFid, amount })
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

  const putUp = (p: PoolPlayer) => commish(() => setLot(auction.id, p.id), `${p.name} on the block`)

  // ── auto-pick: if the commissioner leaves the block idle, promote the next
  //    on-deck player automatically so the auction never stalls. Manual picks
  //    cancel the countdown (the block stops being free). ───────────────────
  const [autoLeft, setAutoLeft] = React.useState<number | null>(null)
  const firedRef = React.useRef(false)
  React.useEffect(() => {
    if (!isCommish || !blockFree || !nextUpId) {
      setAutoLeft(null)
      firedRef.current = false
      return
    }
    firedRef.current = false
    setAutoLeft(AUTO_PICK_SECONDS)
    const t = setInterval(() => {
      setAutoLeft((s) => {
        if (s === null) return null
        if (s <= 1) {
          clearInterval(t)
          if (!firedRef.current) {
            firedRef.current = true
            startTransition(async () => {
              await setLot(auction.id, nextUpId)
              router.refresh()
            })
          }
          return null
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCommish, blockFree, nextUpId, auction.id])

  const lotLabel =
    auction.lotStatus === 'going1'
      ? 'Going once'
      : auction.lotStatus === 'going2'
        ? 'Going twice'
        : auction.lotStatus === 'sold'
          ? 'Sold'
          : auction.lotStatus === 'unsold'
            ? 'Unsold'
            : 'On the block'

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[290px_minmax(0,1fr)_300px]">
      {/* ════ LEFT — pool / up next ════════════════════════════════ */}
      <SideColumn
        className="order-2 lg:order-1"
        icon={isCommish ? Stack : Lightning}
        title={isCommish ? `Player Pool · ${pool.length}` : 'Up Next'}
      >
        {isCommish ? (
          <CommishPool
            pool={pool}
            onDeck={ON_DECK}
            disabled={pending}
            onPick={putUp}
            autoLeft={blockFree ? autoLeft : null}
          />
        ) : (
          <UpNextList players={pool.slice(0, 5)} />
        )}
      </SideColumn>

      {/* ════ MIDDLE — the stage ═══════════════════════════════════ */}
      <div className="order-1 space-y-4 lg:order-2">
        <GlassPanel strong className="relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <AnimatePresence mode="wait">
            {auction.currentPlayer ? (
              <motion.div
                key={auction.currentPlayer.id}
                initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, y: -14, scale: 0.98 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-start"
              >
                <div className={cn('relative', lotOpen && 'animate-pulse-ring rounded-2xl')}>
                  <PlayerCard player={auction.currentPlayer} size="lg" />
                  <AnimatePresence>
                    {(auction.lotStatus === 'sold' || auction.lotStatus === 'unsold') && (
                      <motion.div
                        initial={reduce ? false : { scale: 1.6, opacity: 0, rotate: -18 }}
                        animate={{ scale: 1, opacity: 1, rotate: -14 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                        className={cn(
                          'pointer-events-none absolute inset-0 grid place-items-center',
                        )}
                      >
                        <span
                          className={cn(
                            'rounded-lg border-4 px-4 py-1 font-display text-3xl font-black uppercase tracking-widest',
                            auction.lotStatus === 'sold'
                              ? 'border-success/80 text-success'
                              : 'border-muted-foreground/70 text-muted-foreground',
                          )}
                        >
                          {auction.lotStatus === 'sold' ? 'Sold' : 'Passed'}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                    {lotLabel}
                  </span>

                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Current Bid
                    </p>
                    <div className="relative h-[4.2rem] overflow-hidden">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.p
                          key={high}
                          initial={reduce ? false : { y: 28, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={reduce ? undefined : { y: -28, opacity: 0 }}
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                          className="absolute font-display text-6xl font-black text-primary"
                        >
                          {money(high)}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {auction.highFranchiseName ? (
                        <>
                          <Trophy
                            weight="fill"
                            size={13}
                            className="mb-0.5 mr-1 inline text-warning"
                          />
                          {auction.highFranchiseName}
                        </>
                      ) : (
                        'No bids yet'
                      )}
                    </p>
                  </div>

                  {effectiveFid ? (
                    <div className="mt-5 space-y-3">
                      {lotOpen ? (
                        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                          {[nextMin, nextMin + 5, nextMin + 10].map((amt, i) => (
                            <motion.button
                              key={i}
                              whileTap={reduce ? undefined : { scale: 0.94 }}
                              disabled={pending}
                              onClick={() => bid(amt)}
                              className="skeuo-btn rounded-xl px-5 py-3 font-display text-lg font-bold disabled:opacity-50"
                            >
                              {money(amt)}
                            </motion.button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Waiting for the next lot to open…
                        </p>
                      )}
                      {!linkedFid && (
                        <p className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
                          Bidding as
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: actingFranchise?.color || '#DF2604' }}
                            />
                            {actingFranchise?.name}
                          </span>
                          ·
                          <button
                            onClick={() => choose(null)}
                            className="font-semibold text-primary underline-offset-2 hover:underline"
                          >
                            Switch team
                          </button>
                        </p>
                      )}
                    </div>
                  ) : (
                    <SignInToBid franchises={franchises} onPick={choose} />
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty-lot"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-2 py-16 text-center"
              >
                <Gavel weight="bold" size={40} className="text-muted-foreground" />
                <p className="font-display text-xl font-bold">No lot on the block</p>
                <p className="text-sm text-muted-foreground">
                  {isCommish
                    ? 'Pick a player from the pool — or one will auto-start shortly.'
                    : 'Waiting for the commissioner to put up the next player.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassPanel>

        {/* Commissioner controls */}
        {isCommish && (
          <GlassPanel className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
                <Gavel weight="bold" size={15} /> Auctioneer Controls
              </p>
              <AnimatePresence>
                {autoLeft !== null && (
                  <motion.span
                    initial={reduce ? false : { opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning"
                  >
                    <ClockCountdown weight="bold" size={14} />
                    Auto-start {upNext[0]?.name} in {autoLeft}s
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => commish(() => setLotStatus(auction.id, 'going1'), 'Going once')}
                disabled={pending || !auction.currentPlayer || !lotOpen}
                className="skeuo rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Going once
              </button>
              <button
                onClick={() => commish(() => setLotStatus(auction.id, 'going2'), 'Going twice')}
                disabled={pending || !auction.currentPlayer || !lotOpen}
                className="skeuo rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Going twice
              </button>
              <button
                onClick={() => commish(() => sellLot(auction.id), 'Lot hammered')}
                disabled={pending || !auction.currentPlayer || !lotOpen}
                className="skeuo-btn flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                <CheckCircle weight="bold" size={15} /> Sell / Hammer
              </button>
              {autoLeft !== null && nextUpId && (
                <button
                  onClick={() => upNext[0] && putUp(upNext[0])}
                  disabled={pending}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                >
                  Start now
                </button>
              )}
              {canEnd && (
                <button
                  onClick={() => {
                    if (!confirm('End this auction? You can then start a new Main or Mid auction.'))
                      return
                    commish(() => endAuction(auction.id), 'Auction ended')
                  }}
                  disabled={pending}
                  className="ml-auto rounded-lg px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
                >
                  <XCircle weight="bold" size={15} className="mr-1 inline" /> End auction
                </button>
              )}
            </div>
          </GlassPanel>
        )}

        {/* Purse strip */}
        {franchises.length > 0 && (
          <GlassPanel className="p-3">
            <p className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <CurrencyCircleDollar weight="bold" size={15} /> Purses
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {franchises.map((f) => {
                const remaining = f.purseTotal - f.purseSpent
                const pct = f.purseTotal > 0 ? Math.max(0, (remaining / f.purseTotal) * 100) : 0
                const isMe = f.id === effectiveFid
                const isHigh = f.id === auction.highFranchiseId
                return (
                  <div
                    key={f.id}
                    className={cn(
                      'skeuo min-w-[8.5rem] shrink-0 rounded-xl p-2.5',
                      isHigh && 'ring-2 ring-primary',
                      isMe && !isHigh && 'ring-1 ring-foreground/30',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 truncate text-xs font-semibold">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: f.color || '#DF2604' }}
                        />
                        <span className="truncate">{f.name}</span>
                      </span>
                    </div>
                    <p className="mt-1 font-display text-sm font-bold">{money(remaining)}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: f.color || 'var(--primary)' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassPanel>
        )}

        {/* Live feed */}
        <GlassPanel className="p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Timer weight="bold" size={15} className="text-primary" /> Live Feed
          </p>
          {auction.recentBids.length > 0 ? (
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {auction.recentBids.map((b) => (
                  <motion.li
                    key={b.id}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between rounded-lg bg-foreground/5 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{b.franchiseName}</span>
                    <span className="font-display font-bold text-primary">{money(b.amount)}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No bids yet.</p>
          )}
        </GlassPanel>
      </div>

      {/* ════ RIGHT — sold / passed ════════════════════════════════ */}
      <SideColumn
        className="order-3"
        icon={Trophy}
        title={`Sold · Passed · ${auction.history.length}`}
      >
        {auction.history.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            No lots resolved yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {auction.history.map((h) => (
                <motion.li
                  key={h.id}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="skeuo-inset flex items-center gap-2.5 rounded-xl p-2.5"
                >
                  <span className="font-display text-lg font-black text-primary">{h.ovr}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold leading-tight">
                      {h.name}
                    </span>
                    {h.result === 'sold' ? (
                      <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: h.color || '#DF2604' }}
                        />
                        {h.franchiseName ?? 'Team'}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Passed</span>
                    )}
                  </span>
                  {h.result === 'sold' ? (
                    <span className="font-display text-sm font-bold text-success">
                      {money(h.price ?? 0)}
                    </span>
                  ) : (
                    <XCircle weight="bold" size={16} className="text-muted-foreground" />
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </SideColumn>
    </div>
  )
}

/** Sticky, scrollable side column shell. */
function SideColumn({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: React.ComponentType<{ weight?: 'bold' | 'fill'; size?: number; className?: string }>
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('lg:sticky lg:top-20', className)}>
      <GlassPanel className="flex max-h-[calc(100vh-7rem)] flex-col p-3">
        <p className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Icon weight="bold" size={15} className="text-primary" /> {title}
        </p>
        <div className="-mr-1 flex-1 overflow-y-auto pr-1">{children}</div>
      </GlassPanel>
    </div>
  )
}

/** Commissioner: searchable full pool; tap a player to put them on the block. */
function CommishPool({
  pool,
  onDeck,
  disabled,
  onPick,
  autoLeft,
}: {
  pool: PoolPlayer[]
  onDeck: number
  disabled: boolean
  onPick: (p: PoolPlayer) => void
  autoLeft: number | null
}) {
  const [q, setQ] = React.useState('')
  const filtered = q ? pool.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : pool

  return (
    <div className="space-y-2">
      <div className="relative">
        <MagnifyingGlass
          weight="bold"
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search pool…"
          className="skeuo-inset w-full rounded-lg bg-transparent py-2 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/40"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          {pool.length === 0 ? 'Pool is empty.' : 'No matches.'}
        </p>
      ) : (
        <ul className="space-y-1.5" data-testid="pool-list">
          {filtered.map((p, i) => {
            const deck = !q && i < onDeck
            return (
              <li key={p.id}>
                <button
                  onClick={() => onPick(p)}
                  disabled={disabled}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition-colors disabled:opacity-40',
                    deck ? 'skeuo-btn ring-1 ring-primary/40' : 'skeuo-inset hover:bg-foreground/5',
                  )}
                >
                  <span className="font-display text-lg font-black text-primary">{p.ovr}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold leading-tight">
                      {p.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.position}</span>
                  </span>
                  {deck && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {i === 0 && autoLeft !== null ? `${autoLeft}s` : 'On deck'}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Owners / public: read-only "who's next" list. */
function UpNextList({ players }: { players: PoolPlayer[] }) {
  if (players.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-muted-foreground">Nobody queued.</p>
  }
  return (
    <ul className="space-y-1.5">
      {players.map((p, i) => (
        <li
          key={p.id}
          className={cn(
            'flex items-center gap-2.5 rounded-xl p-2.5',
            i === 0 ? 'skeuo-btn ring-1 ring-primary/40' : 'skeuo-inset',
          )}
        >
          <span className="font-display text-lg font-black text-primary">{p.ovr}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold leading-tight">{p.name}</span>
            <span className="text-xs text-muted-foreground">{p.position}</span>
          </span>
          {i === 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Next
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * Login-free bidder identity. Tap "Sign in" to reveal the teams, then pick the
 * one you're representing — that team is whose purse your bids draw from.
 */
function SignInToBid({
  franchises,
  onPick,
}: {
  franchises: AuctionFranchise[]
  onPick: (id: string) => void
}) {
  const [open, setOpen] = React.useState(false)

  if (!open) {
    return (
      <div className="mt-5">
        <button
          onClick={() => setOpen(true)}
          className="skeuo-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 font-display text-base font-bold"
        >
          <SignIn weight="bold" size={18} /> Sign in to bid
        </button>
        <p className="mt-2 text-xs text-muted-foreground">Pick your team to start bidding.</p>
      </div>
    )
  }

  return (
    <div className="mt-5 space-y-2.5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <UsersThree weight="bold" size={14} className="text-primary" /> Which team are you?
      </p>
      <div className="flex flex-wrap gap-2">
        {franchises.map((f) => (
          <button
            key={f.id}
            onClick={() => onPick(f.id)}
            className="skeuo-btn flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: f.color || '#DF2604' }}
            />
            {f.name}
          </button>
        ))}
      </div>
      <button
        onClick={() => setOpen(false)}
        className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  )
}
