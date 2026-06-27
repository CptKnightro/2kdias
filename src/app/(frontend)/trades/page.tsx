import { ArrowsLeftRight, ArrowRight, Clock } from '@phosphor-icons/react/dist/ssr'
import { safeQuery } from '@/lib/payload'
import { PageHeader, EmptyState, GlassPanel } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { cn } from '@/lib/utils'
import { timeUntil, shortDate } from '@/lib/trades'
import { syncTradeStates } from '@/lib/trades-server'
import { ProposeTrade, type PlayerLite } from './propose-trade'
import type { Option } from '@/components/commissioner/fields'

// Dynamic so the live expiry sweep + countdowns are always fresh.
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Trade Center' }

const STATUS_STYLE: Record<string, string> = {
  proposed: 'bg-warning/15 text-warning',
  countered: 'bg-chart-3/15 text-chart-3',
  accepted: 'bg-success/15 text-success',
  rejected: 'bg-muted text-muted-foreground',
  vetoed: 'bg-primary/15 text-primary',
  expired: 'bg-muted text-muted-foreground',
}

const fid = (v: unknown): string =>
  v == null ? '' : String(typeof v === 'object' ? (v as { id: number }).id : v)

type TradeCard = {
  id: string
  from: string
  to: string
  offered: string[]
  requested: string[]
  cash: number
  status: string
  expiresAt: string | null
  endsAt: string | null
}

type TradesData = {
  trades: TradeCard[]
  franchiseOptions: Option[]
  players: PlayerLite[]
}

export default async function TradesPage() {
  const { data, dbReady } = await safeQuery<TradesData>(
    async (payload) => {
      // Expire stale offers + revert any loans whose window has ended.
      await syncTradeStates(payload)

      const [tr, fr, pl] = await Promise.all([
        payload.find({ collection: 'trades', sort: '-createdAt', limit: 50, depth: 1 }),
        payload.find({ collection: 'franchises', sort: 'name', limit: 200, depth: 0 }),
        payload.find({ collection: 'players', sort: 'name', limit: 500, depth: 0 }),
      ])

      const trades: TradeCard[] = tr.docs.map((t) => ({
        id: String(t.id),
        from: typeof t.fromFranchise === 'object' ? (t.fromFranchise?.name ?? '—') : '—',
        to: typeof t.toFranchise === 'object' ? (t.toFranchise?.name ?? '—') : '—',
        offered: (Array.isArray(t.offeredPlayers) ? t.offeredPlayers : [])
          .map((p) => (typeof p === 'object' ? p?.name : null))
          .filter(Boolean) as string[],
        requested: (Array.isArray(t.requestedPlayers) ? t.requestedPlayers : [])
          .map((p) => (typeof p === 'object' ? p?.name : null))
          .filter(Boolean) as string[],
        cash: t.cashAdjustment ?? 0,
        status: t.status ?? 'proposed',
        expiresAt: t.expiresAt ?? null,
        endsAt: t.endsAt ?? null,
      }))

      const franchiseOptions: Option[] = fr.docs.map((f) => ({
        label: f.name,
        value: String(f.id),
      }))

      const players: PlayerLite[] = pl.docs.map((p) => ({
        id: String(p.id),
        name: p.name,
        ovr: p.ovr ?? 0,
        franchise: fid(p.franchise),
      }))

      return { trades, franchiseOptions, players }
    },
    { trades: [], franchiseOptions: [], players: [] },
  )

  if (!dbReady) {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  const { trades, franchiseOptions, players } = data

  return (
    <div>
      <PageHeader
        title="Trade Center"
        icon={ArrowsLeftRight}
        subtitle="Propose, counter & settle deals"
        action={<ProposeTrade franchiseOptions={franchiseOptions} players={players} />}
      />
      {trades.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {trades.map((t) => (
            <GlassPanel key={t.id} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-lg font-bold">
                  {t.from}{' '}
                  <ArrowRight weight="bold" size={16} className="mx-1 inline text-primary" /> {t.to}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                    STATUS_STYLE[t.status] ?? 'bg-muted',
                  )}
                >
                  {t.status === 'expired' && t.endsAt ? 'ended' : t.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="skeuo-inset rounded-lg p-3">
                  <p className="mb-1 text-[10px] uppercase text-muted-foreground">Gives</p>
                  {t.offered.length ? (
                    t.offered.map((n) => <p key={n}>{n}</p>)
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>
                <div className="skeuo-inset rounded-lg p-3">
                  <p className="mb-1 text-[10px] uppercase text-muted-foreground">Gets</p>
                  {t.requested.length ? (
                    t.requested.map((n) => <p key={n}>{n}</p>)
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>
              </div>
              {t.cash !== 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Cash adjustment: {t.cash > 0 ? '+' : ''}
                  {t.cash}
                </p>
              )}
              <TradeMeta status={t.status} expiresAt={t.expiresAt} endsAt={t.endsAt} />
            </GlassPanel>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ArrowsLeftRight}
          title="No trades yet"
          description="Propose a trade to another franchise — pick the teams, offer up to 3 players, and ask for up to 3. The commissioner accepts, counters, or rejects."
          cta={<ProposeTrade franchiseOptions={franchiseOptions} players={players} />}
        />
      )}
    </div>
  )
}

/**
 * Timing line under a trade card. Open offers show the accept-by countdown;
 * active loans show when the players head back to their own teams.
 */
function TradeMeta({
  status,
  expiresAt,
  endsAt,
}: {
  status: string
  expiresAt: string | null
  endsAt: string | null
}) {
  if (status === 'proposed' || status === 'countered') {
    const t = timeUntil(expiresAt)
    if (!t || t.past) return null
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning">
        <Clock weight="bold" size={13} /> Offer expires in {t.short}
      </p>
    )
  }

  if (status === 'accepted') {
    const t = timeUntil(endsAt)
    if (!t || t.past) return null
    const on = shortDate(endsAt)
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success">
        <Clock weight="bold" size={13} /> On loan · players return in {t.short}
        {on ? ` (${on})` : ''}
      </p>
    )
  }

  if (status === 'expired') {
    const ended = shortDate(endsAt)
    if (ended)
      return (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clock weight="bold" size={13} /> Ended {ended} · players returned
        </p>
      )
    const lapsed = shortDate(expiresAt)
    if (lapsed)
      return (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clock weight="bold" size={13} /> Expired {lapsed}
        </p>
      )
  }

  return null
}
