import Link from 'next/link'
import { ListNumbers } from '@phosphor-icons/react/dist/ssr'
import { safeQuery } from '@/lib/payload'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { StandingsBoard, type StandingRow } from './standings-board'

export const revalidate = 3600 // cached; purged on-demand via Payload hooks (src/lib/revalidate.ts)
export const metadata = { title: 'Standings' }

const ownerName = (v: unknown): string | null =>
  v && typeof v === 'object' && 'name' in v ? ((v as { name?: string }).name ?? null) : null

export default async function StandingsPage() {
  const { data, dbReady } = await safeQuery<StandingRow[]>(
    async (payload) => {
      // depth 1 so the owner relationship is populated (owner is a `users` doc).
      const fr = await payload.find({ collection: 'franchises', limit: 50, depth: 1 })
      const table: Record<string, StandingRow> = {}
      for (const f of fr.docs) {
        table[String(f.id)] = {
          id: String(f.id),
          team: f.name,
          owner: ownerName(f.owner),
          color: f.color ?? '#DF2604',
          w: 0,
          l: 0,
          pf: 0,
          pa: 0,
        }
      }
      const matches = await payload.find({
        collection: 'matches',
        where: { status: { equals: 'final' } },
        limit: 500,
        depth: 0,
      })
      for (const m of matches.docs) {
        const home = String(typeof m.homeFranchise === 'object' ? m.homeFranchise?.id : m.homeFranchise)
        const away = String(typeof m.awayFranchise === 'object' ? m.awayFranchise?.id : m.awayFranchise)
        const hs = m.homeScore ?? 0
        const as = m.awayScore ?? 0
        if (table[home]) {
          table[home].pf += hs
          table[home].pa += as
          hs >= as ? table[home].w++ : table[home].l++
        }
        if (table[away]) {
          table[away].pf += as
          table[away].pa += hs
          as > hs ? table[away].w++ : table[away].l++
        }
      }
      return Object.values(table).sort((a, b) => b.w - a.w || b.pf - b.pa - (a.pf - a.pa))
    },
    [] as StandingRow[],
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
      <PageHeader title="Standings" icon={ListNumbers} subtitle="Seeding & league table" />
      {data.length > 0 ? (
        <StandingsBoard rows={data} />
      ) : (
        <EmptyState
          icon={ListNumbers}
          title="No teams yet"
          description="Add franchises and the seeding builds itself — log match results to rank them."
          cta={
            <Link href="/matches" className="skeuo-btn rounded-lg px-4 py-2 font-semibold">
              Go to Matches
            </Link>
          }
        />
      )}
    </div>
  )
}
