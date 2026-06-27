import { Basketball, ChartBar, Crown, Fire } from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@phosphor-icons/react'
import { GlassPanel } from '@/components/ui-bits'
import { ownerLabel, standingsSort, PRIMARY, type Records, type TeamStat } from '@/lib/home-stats'

function MiniStat({
  label,
  value,
  sub,
  icon: IconCmp,
}: {
  label: string
  value: string | number
  sub?: string | null
  icon: Icon
}) {
  return (
    <GlassPanel className="flex items-center gap-3 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <IconCmp weight="bold" size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase leading-tight tracking-wide text-muted-foreground">{label}</p>
        {sub && <p className="truncate text-xs font-semibold leading-tight text-foreground/80">{sub}</p>}
      </div>
      <p className="shrink-0 pl-1 font-display text-2xl font-black leading-none tabular-nums sm:text-3xl">
        {value}
      </p>
    </GlassPanel>
  )
}

/** The four headline league numbers. Team-specific tiles carry the owner name subtly below. */
export function StatTiles({ stats, records }: { stats: TeamStat[]; records: Records }) {
  const played = stats.filter((s) => s.games > 0)
  const totalMatches = played.reduce((a, s) => a + s.games, 0) / 2
  const totalPoints = played.reduce((a, s) => a + s.pointsFor, 0)
  const topSeed = [...played].sort(standingsSort)[0] ?? null
  const high = records.highestTeamScore

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MiniStat label="Matches" value={totalMatches} icon={Basketball} />
      <MiniStat label="Total Points" value={totalPoints} icon={ChartBar} />
      <MiniStat
        label="Top Seed"
        value={topSeed ? `${topSeed.wins}-${topSeed.losses}` : '—'}
        sub={topSeed ? ownerLabel(topSeed) : null}
        icon={Crown}
      />
      <MiniStat
        label="Highest Score"
        value={high ? high.score : '—'}
        sub={high ? high.owner : null}
        icon={Fire}
      />
    </div>
  )
}

/** Full league table, ordered by wins then point differential. Owner name leads each row. */
export function StandingsTable({ stats }: { stats: TeamStat[] }) {
  const table = [...stats].filter((s) => s.games > 0).sort(standingsSort)
  if (table.length === 0) return null

  return (
    <GlassPanel className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[26rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-semibold">Owner</th>
              <th className="px-2 py-2.5 text-center font-semibold">GP</th>
              <th className="px-2 py-2.5 text-center font-semibold">W</th>
              <th className="px-2 py-2.5 text-center font-semibold">L</th>
              <th className="px-2 py-2.5 text-center font-semibold">PF</th>
              <th className="px-2 py-2.5 text-center font-semibold">PA</th>
              <th className="px-4 py-2.5 text-center font-semibold">Diff</th>
            </tr>
          </thead>
          <tbody>
            {table.map((s) => {
              const diff = s.pointsFor - s.pointsAgainst
              return (
                <tr key={s.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-full"
                        style={{ background: s.color ?? PRIMARY }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold leading-tight">{ownerLabel(s)}</span>
                        {s.owner && (
                          <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                            {s.name}
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums text-muted-foreground">{s.games}</td>
                  <td className="px-2 py-2.5 text-center font-bold tabular-nums">{s.wins}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums text-muted-foreground">{s.losses}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{s.pointsFor}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums text-muted-foreground">{s.pointsAgainst}</td>
                  <td
                    className={`px-4 py-2.5 text-center font-bold tabular-nums ${
                      diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {diff > 0 ? '+' : ''}
                    {diff}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  )
}
