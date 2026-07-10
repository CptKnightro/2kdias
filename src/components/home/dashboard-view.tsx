import Link from 'next/link'
import {
  ArrowsLeftRight,
  Trophy,
  Users as UsersIcon,
  CaretRight,
  ChartBar,
  ChartLineUp,
  ChartPieSlice,
  Ranking,
} from '@phosphor-icons/react/dist/ssr'
import { GlassPanel } from '@/components/ui-bits'
import { ChartCard } from '@/components/home/chart-card'
import { StatTiles, StandingsTable } from '@/components/home/match-stats'
import { HeadToHead } from '@/components/home/head-to-head'
import { FormGuide } from '@/components/home/form-guide'
import { RecordCards } from '@/components/home/record-cards'
import { TeamBars } from '@/components/home/charts/team-bars'
import { WinShareDonut } from '@/components/home/charts/win-share-donut'
import { ScoringTimeline } from '@/components/home/charts/scoring-timeline'
import { WalkOfShame } from '@/components/walk-of-shame'
import type { ShameRow } from '@/lib/tournament-stats'
import {
  buildWinShare,
  ownerLabel,
  standingsSort,
  type FormRow,
  type HeadToHead as H2H,
  type Records,
  type TeamStat,
  type Timeline,
} from '@/lib/home-stats'

export type DashboardData = {
  season: string
  stats: TeamStat[]
  headToHead: H2H
  form: FormRow[]
  records: Records
  timeline: Timeline
  shame: ShameRow[]
}

const QUICK_LINKS = [
  { href: '/trades', label: 'Trade Center', icon: ArrowsLeftRight, desc: 'Propose & manage deals' },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy, desc: 'Brackets & fixtures' },
  { href: '/standings', label: 'Standings', icon: UsersIcon, desc: 'League table & form' },
]

export function DashboardView({
  season,
  stats,
  headToHead,
  form,
  records,
  timeline,
  shame,
}: DashboardData) {
  const played = stats.filter((s) => s.games > 0)
  const hasMatches = played.length > 0

  const winShare = buildWinShare(stats)
  const ranked = [...played].sort(standingsSort)
  const byWins = ranked.map((s) => ({
    id: s.id,
    label: ownerLabel(s),
    value: s.wins,
    color: s.color,
  }))
  const byPpg = [...played]
    .map((s) => ({
      id: s.id,
      label: ownerLabel(s),
      value: s.games ? Math.round(s.pointsFor / s.games) : 0,
      color: s.color,
    }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6">
      {/* Season — centered hero */}
      <div className="flex justify-center pt-1">
        <div className="glass-strong relative inline-flex flex-col items-center overflow-hidden rounded-3xl px-12 py-8 text-center sm:px-16 sm:py-9">
          <div className="pointer-events-none absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
          <p className="relative font-display text-5xl font-black uppercase leading-none tracking-tight sm:text-6xl">
            {season}
          </p>
        </div>
      </div>

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

            <StatTiles stats={stats} records={records} />

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
                  {ranked.map((s, i) => {
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
                          {s.wins}-{s.losses}
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
              <ChartCard title="Points per game" icon={ChartBar}>
                <TeamBars data={byPpg} unit="pts" />
              </ChartCard>
            </div>

            {/* Head-to-head + form */}
            <div className="grid items-start gap-3 md:grid-cols-2">
              <HeadToHead teams={headToHead.teams} matrix={headToHead.matrix} />
              <FormGuide rows={form} />
            </div>

            {/* Scoring timeline */}
            {timeline.data.length > 1 && (
              <ChartCard title="Scoring timeline" icon={ChartLineUp} hint="cumulative points">
                <ScoringTimeline series={timeline.series} data={timeline.data} />
              </ChartCard>
            )}

            <StandingsTable stats={stats} />

            {/* Walk of Shame — walkover losses, league + tournament combined */}
            <WalkOfShame rows={shame} subtitle="League + tournament combined" />
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
