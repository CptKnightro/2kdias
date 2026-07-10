import { Crown, ChartPieSlice, Ranking, Trophy } from '@phosphor-icons/react/dist/ssr'
import { TeamLogo } from '@/components/team-logo'
import { GlassPanel, EmptyState } from '@/components/ui-bits'
import { ChartCard } from '@/components/home/chart-card'
import { StandingsTable } from '@/components/home/match-stats'
import { WinShareDonut } from '@/components/home/charts/win-share-donut'
import { TeamBars, type BarDatum } from '@/components/home/charts/team-bars'
import { WalkOfShame } from '@/components/walk-of-shame'
import { buildWinShare, ownerLabel, type TeamStat } from '@/lib/home-stats'
import type { ShameRow, TitleRow } from '@/lib/tournament-stats'

/**
 * Tournament analytics — the "core set" dashboard aggregated across every
 * tournament's games (1v1 + 2v2). Reuses the home chart components; the shape
 * of `stats` matches the league board so StandingsTable / buildWinShare work
 * unchanged. Body-only — the analytics shell supplies the header + caption.
 */
export function TournamentDashboard({
  stats,
  titles,
  shame,
  gameCount,
}: {
  stats: TeamStat[]
  titles: TitleRow[]
  shame: ShameRow[]
  gameCount: number
}) {
  if (gameCount === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No tournament games yet"
        description="Once games are logged inside a tournament, the analysis — standings, win share, titles and the Walk of Shame — shows up here."
      />
    )
  }

  const winShare = buildWinShare(stats)
  const byWins: BarDatum[] = [...stats]
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 8)
    .map((s) => ({ id: s.id, label: ownerLabel(s), value: s.wins, color: s.color }))

  return (
    <div className="space-y-5">
      <div className="grid items-start gap-4 md:grid-cols-2">
        <TitlesCard titles={titles} />
        <WalkOfShame rows={shame} subtitle="League + tournament combined" />
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <ChartCard title="Win share" icon={ChartPieSlice} hint="tournament wins" fill>
          <WinShareDonut slices={winShare.slices} totalWins={winShare.totalWins} />
        </ChartCard>
        <ChartCard title="Wins by owner" icon={Ranking} hint="tournament games" fill>
          {byWins.length ? (
            <TeamBars data={byWins} unit="wins" />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No wins yet.</p>
          )}
        </ChartCard>
      </div>

      <StandingsTable stats={stats} />
    </div>
  )
}

/** Titles won leaderboard (champions of completed tournaments). */
function TitlesCard({ titles }: { titles: TitleRow[] }) {
  return (
    <GlassPanel className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Crown weight="fill" size={18} className="text-warning" />
        <h3 className="font-display text-lg font-black uppercase tracking-tight">Titles</h3>
        <span className="ml-auto text-[11px] uppercase tracking-wider text-muted-foreground">
          tournaments won
        </span>
      </div>
      {titles.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No champions crowned yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {titles.map((t) => (
            <li key={t.id} className="skeuo-inset flex items-center gap-3 rounded-xl p-2.5">
              <TeamLogo name={t.team} color={t.color} size={22} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.owner}</span>
              <span className="flex items-center gap-1 font-display text-lg font-black tabular-nums text-warning">
                {t.titles}
                <Trophy weight="fill" size={14} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  )
}
