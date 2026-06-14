import Link from 'next/link'
import { ArrowsLeftRight, ArrowRight } from '@phosphor-icons/react/dist/ssr'
import { safeQuery } from '@/lib/payload'
import { PageHeader, EmptyState, GlassPanel } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { cn } from '@/lib/utils'

export const revalidate = 3600 // cached; purged on-demand via Payload hooks (src/lib/revalidate.ts)
export const metadata = { title: 'Trade Center' }

const STATUS_STYLE: Record<string, string> = {
  proposed: 'bg-warning/15 text-warning',
  countered: 'bg-chart-3/15 text-chart-3',
  accepted: 'bg-success/15 text-success',
  rejected: 'bg-muted text-muted-foreground',
  vetoed: 'bg-primary/15 text-primary',
}

export default async function TradesPage() {
  const { data, dbReady } = await safeQuery(
    async (payload) => {
      const res = await payload.find({
        collection: 'trades',
        sort: '-createdAt',
        limit: 50,
        depth: 1,
      })
      return res.docs.map((t) => ({
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
      }))
    },
    [] as {
      id: string
      from: string
      to: string
      offered: string[]
      requested: string[]
      cash: number
      status: string
    }[],
  )

  if (!dbReady) {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  return (
    <div>
      <PageHeader
        title="Trade Center"
        icon={ArrowsLeftRight}
        subtitle="Propose, counter & settle deals"
        action={
          <Link href="/admin/collections/trades/create" className="skeuo-btn rounded-lg px-4 py-2 text-sm font-semibold">
            Propose Trade
          </Link>
        }
      />
      {data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((t) => (
            <GlassPanel key={t.id} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-lg font-bold">
                  {t.from} <ArrowRight weight="bold" size={16} className="mx-1 inline text-primary" /> {t.to}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                    STATUS_STYLE[t.status] ?? 'bg-muted',
                  )}
                >
                  {t.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="skeuo-inset rounded-lg p-3">
                  <p className="mb-1 text-[10px] uppercase text-muted-foreground">Gives</p>
                  {t.offered.length ? t.offered.map((n) => <p key={n}>{n}</p>) : <p className="text-muted-foreground">—</p>}
                </div>
                <div className="skeuo-inset rounded-lg p-3">
                  <p className="mb-1 text-[10px] uppercase text-muted-foreground">Gets</p>
                  {t.requested.length ? t.requested.map((n) => <p key={n}>{n}</p>) : <p className="text-muted-foreground">—</p>}
                </div>
              </div>
              {t.cash !== 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Cash adjustment: {t.cash > 0 ? '+' : ''}
                  {t.cash}
                </p>
              )}
            </GlassPanel>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ArrowsLeftRight}
          title="No trades yet"
          description="Propose a trade to another franchise — offer players and cash, then they accept, counter, or reject."
          cta={
            <Link href="/admin/collections/trades/create" className="skeuo-btn rounded-lg px-4 py-2 font-semibold">
              Propose a Trade
            </Link>
          }
        />
      )}
    </div>
  )
}
