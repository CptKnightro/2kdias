import Link from 'next/link'
import {
  Gavel,
  ArrowsLeftRight,
  Trophy,
  Medal,
  Info,
  CaretRight,
  Broadcast,
  Stack,
} from '@phosphor-icons/react/dist/ssr'
import { GlassPanel, EmptyState } from '@/components/ui-bits'

export type ActivityType = 'auction' | 'trade' | 'match' | 'award' | 'system'

export type StatusData = {
  auctions: { id: number; title: string; status: string; queueCount: number }[]
  activity: {
    id: number
    type: ActivityType
    message: string
    franchiseName: string | null
    franchiseColor: string | null
    date: string
  }[]
  trades: {
    id: number
    fromName: string
    toName: string
    status: string
    offeredCount: number
    requestedCount: number
    date: string
  }[]
}

const TYPE_META: Record<ActivityType, { icon: typeof Gavel; color: string; label: string }> = {
  auction: { icon: Gavel, color: '#DF2604', label: 'Auction' },
  trade: { icon: ArrowsLeftRight, color: '#3B82F6', label: 'Trade' },
  match: { icon: Trophy, color: '#22C55E', label: 'Match' },
  award: { icon: Medal, color: '#F59E0B', label: 'Award' },
  system: { icon: Info, color: '#A1A1AA', label: 'System' },
}

const TRADE_STATUS: Record<string, string> = {
  proposed: '#A1A1AA',
  countered: '#F59E0B',
  accepted: '#22C55E',
  rejected: '#EF4444',
  vetoed: '#EF4444',
  expired: '#71717A',
}

function AuctionBadge({ status }: { status: string }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        Live
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {status === 'scheduled' ? 'Upcoming' : status}
    </span>
  )
}

export function StatusView({ auctions, activity, trades }: StatusData) {
  const liveOrUpcoming = auctions.filter((a) => a.status !== 'ended')
  const isEmpty = liveOrUpcoming.length === 0 && activity.length === 0 && trades.length === 0

  if (isEmpty) {
    return (
      <EmptyState
        icon={Broadcast}
        title="Nothing happening yet"
        description="As the auction runs, trades go through, and games are played, every update lands here."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Live / upcoming auctions */}
      {liveOrUpcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-black uppercase tracking-tight">Auctions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {liveOrUpcoming.map((a) => (
              <GlassPanel key={a.id} strong className="flex items-center gap-4 p-5">
                <span className="skeuo grid h-12 w-12 shrink-0 place-items-center rounded-xl text-primary">
                  <Gavel weight="bold" size={24} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <AuctionBadge status={a.status} />
                  </div>
                  <p className="truncate font-display text-lg font-black uppercase leading-tight tracking-tight">
                    {a.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.queueCount} players queued</p>
                </div>
                <Link
                  href="/auction"
                  className="skeuo-btn flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Enter <CaretRight weight="bold" size={14} />
                </Link>
              </GlassPanel>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity timeline */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 font-display text-xl font-black uppercase tracking-tight">
            League Feed
          </h2>
          {activity.length > 0 ? (
            <ol className="relative space-y-1 pl-2">
              {activity.map((a) => {
                const meta = TYPE_META[a.type] ?? TYPE_META.system
                const Icon = meta.icon
                return (
                  <li
                    key={a.id}
                    className="flex gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-foreground/[0.03]"
                  >
                    <span
                      className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl"
                      style={{ background: `${meta.color}1f`, color: meta.color }}
                    >
                      <Icon weight="bold" size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{a.message}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className="font-semibold uppercase tracking-wider"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        {a.franchiseName && (
                          <>
                            <span className="opacity-40">·</span>
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="size-2 rounded-full"
                                style={{ background: a.franchiseColor ?? '#DF2604' }}
                              />
                              {a.franchiseName}
                            </span>
                          </>
                        )}
                        <span className="opacity-40">·</span>
                        <span>{a.date}</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <GlassPanel className="p-8 text-center text-sm text-muted-foreground">
              No feed activity yet.
            </GlassPanel>
          )}
        </section>

        {/* Recent trades */}
        <section>
          <h2 className="mb-3 font-display text-xl font-black uppercase tracking-tight">
            Recent Trades
          </h2>
          {trades.length > 0 ? (
            <ul className="space-y-2">
              {trades.map((t) => (
                <li key={t.id} className="skeuo rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="truncate">{t.fromName}</span>
                    <ArrowsLeftRight
                      weight="bold"
                      size={14}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="truncate">{t.toName}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t.offeredCount} ⇆ {t.requestedCount} players
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 font-bold uppercase tracking-wider"
                      style={{
                        background: `${TRADE_STATUS[t.status] ?? '#A1A1AA'}26`,
                        color: TRADE_STATUS[t.status] ?? '#A1A1AA',
                      }}
                    >
                      {t.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <GlassPanel className="flex flex-col items-center gap-2 p-6 text-center">
              <Stack weight="bold" size={24} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No trades yet.</p>
              <Link
                href="/commissioner/trades"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Record a trade
              </Link>
            </GlassPanel>
          )}
        </section>
      </div>
    </div>
  )
}
