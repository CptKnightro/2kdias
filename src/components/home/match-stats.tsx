import { ChartBar, Basketball, Trophy, Target } from '@phosphor-icons/react/dist/ssr'
import { GlassPanel } from '@/components/ui-bits'

export type TeamStat = {
  id: number
  name: string
  color: string | null
  games: number
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
}

const PRIMARY = '#DF2604'

/** Horizontal bar chart — one row per team, bar width scaled to the max value. */
function HBars({
  data,
}: {
  data: { id: number; label: string; value: number; color: string | null; sub?: string }[]
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.id} className="flex items-center gap-3">
          <span className="w-20 shrink-0 truncate text-xs font-semibold text-foreground/70" title={d.label}>
            {d.label}
          </span>
          <div className="skeuo-inset h-6 flex-1 overflow-hidden rounded-md">
            <div
              className="h-full rounded-md transition-all"
              style={{
                width: `${Math.max(4, (d.value / max) * 100)}%`,
                background: `linear-gradient(90deg, ${d.color ?? PRIMARY}cc, ${d.color ?? PRIMARY})`,
              }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums">
            {d.sub ?? d.value}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ChartCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof ChartBar
  children: React.ReactNode
}) {
  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon weight="bold" size={16} className="text-primary" />
        <h3 className="font-display text-sm font-black uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </GlassPanel>
  )
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof ChartBar }) {
  return (
    <GlassPanel className="flex items-center gap-3 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon weight="bold" size={18} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl font-black leading-none tabular-nums">{value}</p>
        <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </GlassPanel>
  )
}

export function MatchStats({ stats }: { stats: TeamStat[] }) {
  const played = stats.filter((s) => s.games > 0)

  if (played.length === 0) {
    return (
      <section>
        <h2 className="mb-4 font-display text-2xl font-black uppercase tracking-tight">League Stats</h2>
        <GlassPanel className="p-8 text-center text-sm text-muted-foreground">
          No matches logged yet. Use the <span className="font-semibold text-foreground">Log Match</span> tab to
          record a result — charts appear here once games are in.
        </GlassPanel>
      </section>
    )
  }

  const totalMatches = played.reduce((a, s) => a + s.games, 0) / 2
  const totalPoints = played.reduce((a, s) => a + s.pointsFor, 0)
  const avgPerGame = totalMatches > 0 ? Math.round(totalPoints / totalMatches) : 0
  const topScore = Math.max(...played.map((s) => s.pointsFor))

  const byWins = [...played]
    .sort((a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst))
    .map((s) => ({ id: s.id, label: s.name, value: s.wins, color: s.color }))

  const byPpg = [...played]
    .map((s) => ({ ...s, ppg: s.games ? Math.round(s.pointsFor / s.games) : 0 }))
    .sort((a, b) => b.ppg - a.ppg)
    .map((s) => ({ id: s.id, label: s.name, value: s.ppg, color: s.color }))

  const table = [...played].sort(
    (a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst),
  )

  return (
    <section className="space-y-5">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight">League Stats</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Matches" value={totalMatches} icon={Basketball} />
        <MiniStat label="Total Points" value={totalPoints} icon={ChartBar} />
        <MiniStat label="Avg / Game" value={avgPerGame} icon={Target} />
        <MiniStat label="Top Score" value={topScore} icon={Trophy} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ChartCard title="Wins by team" icon={Trophy}>
          <HBars data={byWins} />
        </ChartCard>
        <ChartCard title="Points per game" icon={ChartBar}>
          <HBars data={byPpg} />
        </ChartCard>
      </div>

      <GlassPanel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[24rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-semibold">Team</th>
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
                    <span className="flex items-center gap-2 font-semibold">
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-full"
                        style={{ background: s.color ?? PRIMARY }}
                      />
                      {s.name}
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
    </section>
  )
}
