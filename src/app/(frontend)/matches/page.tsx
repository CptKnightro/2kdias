import Link from 'next/link'
import { Basketball, Plus } from '@phosphor-icons/react/dist/ssr'
import { safeQuery } from '@/lib/payload'
import { PageHeader, EmptyState, GlassPanel } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { cn } from '@/lib/utils'

export const revalidate = 3600 // cached; purged on-demand via Payload hooks (src/lib/revalidate.ts)
export const metadata = { title: 'Matches' }

export default async function MatchesPage() {
  const { data, dbReady } = await safeQuery(
    async (payload) => {
      const res = await payload.find({ collection: 'matches', sort: '-playedAt', limit: 100, depth: 1 })
      return res.docs.map((m) => ({
        id: String(m.id),
        home: typeof m.homeFranchise === 'object' ? (m.homeFranchise?.name ?? '—') : '—',
        away: typeof m.awayFranchise === 'object' ? (m.awayFranchise?.name ?? '—') : '—',
        homeScore: m.homeScore ?? null,
        awayScore: m.awayScore ?? null,
        status: m.status ?? 'scheduled',
        round: m.round ?? null,
      }))
    },
    [] as {
      id: string
      home: string
      away: string
      homeScore: number | null
      awayScore: number | null
      status: string
      round: string | null
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
        title="Matches"
        icon={Basketball}
        subtitle="Fixtures & results"
        action={
          <Link
            href="/admin/collections/matches/create"
            className="skeuo-btn flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            <Plus weight="bold" size={15} /> Add Result
          </Link>
        }
      />
      {data.length > 0 ? (
        <div className="space-y-2">
          {data.map((m) => {
            const final = m.status === 'final'
            const homeWin = final && (m.homeScore ?? 0) >= (m.awayScore ?? 0)
            return (
              <GlassPanel key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    final ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {m.status}
                </span>
                <span className={cn('flex-1 text-right font-semibold', homeWin && 'text-primary')}>
                  {m.home}
                </span>
                <span className="skeuo-inset rounded-lg px-3 py-1 font-display font-bold">
                  {final ? `${m.homeScore ?? 0} – ${m.awayScore ?? 0}` : 'vs'}
                </span>
                <span className={cn('flex-1 font-semibold', final && !homeWin && 'text-primary')}>
                  {m.away}
                </span>
              </GlassPanel>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Basketball}
          title="No matches yet"
          description="Record your couch co-op games here — scores feed straight into the standings."
          cta={
            <Link href="/admin/collections/matches/create" className="skeuo-btn rounded-lg px-4 py-2 font-semibold">
              Add a Match
            </Link>
          }
        />
      )}
    </div>
  )
}
