import Link from 'next/link'
import { ListNumbers } from '@phosphor-icons/react/dist/ssr'
import { safeQuery } from '@/lib/payload'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { StandingsBoard, type StandingRow } from './standings-board'

export const dynamic = 'force-dynamic' // never cache a transient DB blip (would be served for the whole revalidate window)
export const metadata = { title: 'Standings' }

export default async function StandingsPage() {
  const { data, dbReady } = await safeQuery<StandingRow[]>(
    async (payload) => {
      const fr = await payload.find({ collection: 'franchises', limit: 50, depth: 0 })
      const table: Record<string, StandingRow> = {}
      for (const f of fr.docs) {
        table[String(f.id)] = {
          id: String(f.id),
          team: f.name,
          owner: f.ownerName ?? null,
          color: f.color ?? '#DF2604',
          w: 0,
          l: 0,
          d: 0,
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
        // Score-less finals carry no result — don't let them register as 0-0 draws.
        if (m.homeScore == null || m.awayScore == null) continue
        const home = String(typeof m.homeFranchise === 'object' ? m.homeFranchise?.id : m.homeFranchise)
        const away = String(typeof m.awayFranchise === 'object' ? m.awayFranchise?.id : m.awayFranchise)
        const hs = m.homeScore
        const as = m.awayScore
        if (table[home]) {
          table[home].pf += hs
          table[home].pa += as
          if (hs > as) table[home].w++
          else if (as > hs) table[home].l++
          else table[home].d++
        }
        if (table[away]) {
          table[away].pf += as
          table[away].pa += hs
          if (as > hs) table[away].w++
          else if (hs > as) table[away].l++
          else table[away].d++
        }
      }
      // Wins, then draws (a draw beats a loss), then point differential.
      return Object.values(table).sort(
        (a, b) => b.w - a.w || b.d - a.d || b.pf - b.pa - (a.pf - a.pa),
      )
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
