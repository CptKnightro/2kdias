import Link from 'next/link'
import { ListNumbers } from '@phosphor-icons/react/dist/ssr'
import { safeQuery } from '@/lib/payload'
import { PageHeader, SetupBanner, EmptyState, GlassPanel } from '@/components/ui-bits'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Standings' }

type Row = {
  id: string
  name: string
  color: string
  w: number
  l: number
  pf: number
  pa: number
}

export default async function StandingsPage() {
  const { data, dbReady } = await safeQuery(
    async (payload) => {
      const fr = await payload.find({ collection: 'franchises', limit: 50 })
      const table: Record<string, Row> = {}
      for (const f of fr.docs) {
        table[String(f.id)] = {
          id: String(f.id),
          name: f.name,
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
      const rows = Object.values(table).sort(
        (a, b) => b.w - a.w || b.pf - b.pa - (a.pf - a.pa),
      )
      return rows
    },
    [] as Row[],
  )

  return (
    <div>
      <PageHeader title="Standings" icon={ListNumbers} subtitle="League table" />
      {!dbReady && <SetupBanner />}
      {data.length > 0 ? (
        <GlassPanel className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">#</th>
                <th className="px-2 py-3">Team</th>
                <th className="px-2 py-3 text-center">W</th>
                <th className="px-2 py-3 text-center">L</th>
                <th className="px-2 py-3 text-center">PF</th>
                <th className="px-2 py-3 text-center">PA</th>
                <th className="px-4 py-3 text-center">Diff</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr
                  key={r.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-foreground/5',
                    i === 0 && 'bg-primary/5',
                  )}
                >
                  <td className="px-4 py-3 font-display font-bold text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-3">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                      {r.name}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center font-bold text-success">{r.w}</td>
                  <td className="px-2 py-3 text-center text-muted-foreground">{r.l}</td>
                  <td className="px-2 py-3 text-center">{r.pf}</td>
                  <td className="px-2 py-3 text-center">{r.pa}</td>
                  <td
                    className={cn(
                      'px-4 py-3 text-center font-display font-bold',
                      r.pf - r.pa > 0 ? 'text-success' : r.pf - r.pa < 0 ? 'text-primary' : '',
                    )}
                  >
                    {r.pf - r.pa > 0 ? '+' : ''}
                    {r.pf - r.pa}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassPanel>
      ) : (
        dbReady && (
          <EmptyState
            icon={ListNumbers}
            title="No results yet"
            description="The table builds itself as you record match results."
            cta={
              <Link href="/matches" className="skeuo-btn rounded-lg px-4 py-2 font-semibold">
                Go to Matches
              </Link>
            }
          />
        )
      )}
    </div>
  )
}
