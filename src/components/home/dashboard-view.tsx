import Link from 'next/link'
import {
  ArrowsLeftRight,
  Trophy,
  Users as UsersIcon,
  CaretRight,
  ChartLineUp,
  ChartPieSlice,
  Medal,
  Ranking,
} from '@phosphor-icons/react/dist/ssr'
import { GlassPanel } from '@/components/ui-bits'
import { ChartCard } from '@/components/home/chart-card'
import { StatTiles, StandingsTable } from '@/components/home/match-stats'
import { HeadToHead } from '@/components/home/head-to-head'
import { FormGuide } from '@/components/home/form-guide'
import { RecordCards } from '@/components/home/record-cards'
import { TrophyCase, type TrophyCaseRow } from '@/components/home/trophy-case'
import { TeamBars } from '@/components/home/charts/team-bars'
import { WinShareDonut } from '@/components/home/charts/win-share-donut'
import { ScoringTimeline } from '@/components/home/charts/scoring-timeline'
import { WalkOfShame } from '@/components/walk-of-shame'
import type { ShameRow } from '@/lib/tournament-stats'
import {
  buildWinShare,
  ownerLabel,
  recordLabel,
  standingsSort,
  type FormRow,
  type HeadToHead as H2H,
  type Records,
  type TeamStat,
  type Timeline,
} from '@/lib/home-stats'

export type DashboardData = {
  stats: TeamStat[]
  headToHead: H2H
  form: FormRow[]
  records: Records
  timeline: Timeline
  shame: ShameRow[]
  /** Scope note under the Walk of Shame — the two rings cover different games. */
  shameSubtitle: string
  /** 2K games can end level — its view shows W-L-D for everyone; G.O.A.T stays W-L. */
  showDraws: boolean
  trophyCase: TrophyCaseRow[]
}

const QUICK_LINKS = [
  { href: '/trades', label: 'Trade Center', icon: ArrowsLeftRight, desc: 'Propose & manage deals' },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy, desc: 'Brackets & fixtures' },
  { href: '/standings', label: 'Standings', icon: UsersIcon, desc: 'League table & form' },
]

export function DashboardView({
  stats,
  headToHead,
  form,
  records,
  timeline,
  shame,
  shameSubtitle,
  showDraws,
  trophyCase,
}: DashboardData) {
  const played = stats.filter((s) => s.games > 0)
  const hasMatches = played.length > 0

  const winShare = buildWinShare(stats)
  const ranked = [...played].sort(standingsSort)
  // Win-rate board + standings list every franchise (0-game teams like Lakers
  // included), un-played teams last. The bars/donut/timeline below stay
  // played-only — a team with no games has nothing to plot.
  const standings = [...stats].sort(
    (a, b) => (b.games > 0 ? 1 : 0) - (a.games > 0 ? 1 : 0) || standingsSort(a, b),
  )
  const byWins = ranked.map((s) => ({
    id: s.id,
    label: ownerLabel(s),
    value: s.wins,
    color: s.color,
  }))

  return (
    <div className="space-y-6">
      {!hasMatches ? (
        <section>
          <h2 className="mb-4 font-display text-2xl font-black uppercase tracking-tight">
            League Stats
          </h2>
          <GlassPanel className="p-8 text-center text-sm text-muted-foreground">
            No matches logged yet. Use the{' '}
            <span className="font-semibold text-foreground">Log Match</span> tab to record a result
            — charts appear here once games are in.
          </GlassPanel>
        </section>
      ) : (
        <>
          <section className="space-y-5">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">
              League Stats
            </h2>

            <StatTiles stats={stats} records={records} showDraws={showDraws} />

            {/* Win share donut + win-rate leaderboard */}
            <div className="grid gap-3 md:grid-cols-2">
              <ChartCard title="Win share" icon={ChartPieSlice} fill>
                {winShare.slices.length > 0 ? (
                  <WinShareDonut slices={winShare.slices} totalWins={winShare.totalWins} />
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No wins recorded yet.
                  </p>
                )}
              </ChartCard>
              <ChartCard title="Win rate" icon={Ranking} fill>
                <ul className="space-y-2.5">
                  {standings.map((s, i) => {
                    const pct = s.games ? Math.round((s.wins / s.games) * 100) : 0
                    return (
                      <li key={s.id} className="flex items-center gap-2.5 text-sm">
                        <span className="w-4 shrink-0 text-center text-xs font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: s.color ?? undefined }}
                        />
                        <span className="flex-1 truncate font-semibold">{ownerLabel(s)}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {recordLabel(s, showDraws)}
                        </span>
                        <span className="w-11 shrink-0 text-right font-bold tabular-nums">
                          {pct}%
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </ChartCard>
            </div>

            {/* Wins + PPG bars */}
            <div className="grid gap-3 md:grid-cols-2">
              <ChartCard title="Wins by owner" icon={Trophy}>
                <TeamBars data={byWins} unit="W" />
              </ChartCard>
              <ChartCard title="Trophy case" icon={Medal} hint="rings">
                <TrophyCase rows={trophyCase} />
              </ChartCard>
            </div>

            {/* Head-to-head + form */}
            <div className="grid gap-3 md:grid-cols-2">
              <HeadToHead teams={headToHead.teams} matrix={headToHead.matrix} />
              <FormGuide rows={form} />
            </div>

            {/* Scoring timeline */}
            {timeline.data.length > 1 && (
              <ChartCard title="Scoring timeline" icon={ChartLineUp} hint="cumulative points">
                <ScoringTimeline series={timeline.series} data={timeline.data} />
              </ChartCard>
            )}

            <StandingsTable stats={stats} showDraws={showDraws} />

            {/* Walk of Shame — walkover losses within this ring's scope */}
            <WalkOfShame rows={shame} subtitle={shameSubtitle} />
          </section>

          <RecordCards records={records} />
        </>
      )}

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {QUICK_LINKS.map(({ href, label, icon: Icon, desc }) => (
          <Link
            key={href}
            href={href}
            className="skeuo flex items-center gap-3 rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon weight="bold" size={20} />
            </span>
            <div className="flex-1">
              <p className="font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <CaretRight weight="bold" size={16} className="text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  )
}
