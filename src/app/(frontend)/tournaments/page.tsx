import Link from 'next/link'
import { Trophy, CaretRight } from '@phosphor-icons/react/dist/ssr'
import { safeQuery } from '@/lib/payload'
import { PageHeader, EmptyState, GlassPanel } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { cn } from '@/lib/utils'
import { TournamentDashboard } from '@/components/tournament/tournament-dashboard'
import { SingleTournamentPanel } from '@/components/tournament/single-tournament'
import {
  TournamentAnalytics,
  type AnalyticsPanel,
} from '@/components/tournament/tournament-analytics'
import type { FranchiseRow, TeamStat } from '@/lib/home-stats'
import {
  buildTournamentStats,
  buildTitles,
  buildWalkOfShame,
  buildSeries,
  buildPairings,
  bracketToSideGames,
  matchToSideGame,
  isDoublesTournament,
  tripleToSideGames,
  tripleChampionIds,
} from '@/lib/tournament-stats'
import { isTripleThreat } from '@/lib/triple-threat'
import {
  type SideGame,
  type Series,
  type PairStat,
  type ShameRow,
  type TitleRow,
} from '@/lib/tournament-stats'

export const dynamic = 'force-dynamic' // never cache a transient DB blip (would be served for the whole revalidate window)
export const metadata = { title: 'Tournaments' }

const BEST_OF = 5 // every tournament series runs best-of-5 (first to 3)

type TournamentListItem = {
  id: string
  name: string
  status: string
  season: string | null
  participants: string[]
  champion: string | null
}

/** Per-tournament analysis payload (plain data — rendered into a panel below). */
type TournamentPanel = {
  id: string
  name: string
  status: string
  /** Triple Threats render a standings/titles dashboard; others the OG series panel. */
  triple: boolean
  doubles: boolean
  gameCount: number
  stats: TeamStat[]
  series: Series[]
  pairings: PairStat[]
  titles: TitleRow[]
  shame: ShameRow[]
  editions: number
}

type TournamentsData = {
  list: TournamentListItem[]
  all: { stats: TeamStat[]; titles: TitleRow[]; shame: ShameRow[]; gameCount: number }
  tournaments: TournamentPanel[]
}

export default async function TournamentsPage() {
  const { data, dbReady } = await safeQuery<TournamentsData>(
    async (payload) => {
      const [tourneys, franchiseRes, matchRes] = await Promise.all([
        payload.find({ collection: 'tournaments', sort: '-createdAt', limit: 200, depth: 1 }),
        payload.find({ collection: 'franchises', sort: 'name', limit: 200, depth: 0 }),
        // League matches (tournament games live in brackets) — for the combined Walk of Shame.
        payload.find({
          collection: 'matches',
          where: {
            and: [
              { homeScore: { exists: true } },
              { awayScore: { exists: true } },
              { tournament: { exists: false } },
            ],
          },
          sort: '-playedAt',
          limit: 1000,
          depth: 0,
        }),
      ])

      const franchises: FranchiseRow[] = franchiseRes.docs.map((f) => ({
        id: f.id as number,
        name: f.name,
        owner: f.ownerName ?? null,
        color: f.color ?? null,
      }))

      // Tournament games = OG bracket games + every Triple Threat edition game.
      const tourneyGames: SideGame[] = tourneys.docs.flatMap((t) => [
        ...bracketToSideGames(t.bracket),
        ...tripleToSideGames(t.bracket),
      ])
      // Titles = each OG champion + every decided Triple Threat edition champion.
      const championIds: number[] = tourneys.docs.flatMap((t) => {
        if (isTripleThreat(t.bracket)) return tripleChampionIds(t.bracket)
        const c = typeof t.champion === 'object' ? t.champion?.id : t.champion
        return typeof c === 'number' ? [c] : []
      })
      const leagueGames: SideGame[] = matchRes.docs
        .map((m) => matchToSideGame(m))
        .filter((g): g is SideGame => g !== null)

      const list: TournamentListItem[] = tourneys.docs.map((t) => ({
        id: String(t.id),
        name: t.name,
        status: t.status ?? 'upcoming',
        season: t.season ?? null,
        participants: (Array.isArray(t.participants) ? t.participants : [])
          .map((p) => (typeof p === 'object' && p ? p.ownerName || p.name : null))
          .filter(Boolean) as string[],
        champion: typeof t.champion === 'object' ? (t.champion?.name ?? null) : null,
      }))

      // Per-tournament drill-down. Triple Threats show a standings + titles
      // dashboard (their games are 1v1); OG shows the rotating-2v2 series panel.
      const tournaments: TournamentPanel[] = tourneys.docs.map((t) => {
        if (isTripleThreat(t.bracket)) {
          const games = tripleToSideGames(t.bracket)
          const champs = tripleChampionIds(t.bracket)
          return {
            id: String(t.id),
            name: t.name,
            status: t.status ?? 'in-progress',
            triple: true,
            doubles: false,
            gameCount: games.length,
            stats: buildTournamentStats(franchises, games),
            series: [],
            pairings: [],
            titles: buildTitles(franchises, champs),
            shame: buildWalkOfShame(franchises, games),
            editions: champs.length,
          }
        }
        const games = bracketToSideGames(t.bracket)
        return {
          id: String(t.id),
          name: t.name,
          status: t.status ?? 'upcoming',
          triple: false,
          doubles: isDoublesTournament(games),
          gameCount: games.length,
          stats: buildTournamentStats(franchises, games),
          series: buildSeries(franchises, games, BEST_OF),
          pairings: buildPairings(franchises, games),
          titles: [],
          shame: [],
          editions: 0,
        }
      })

      return {
        list,
        all: {
          stats: buildTournamentStats(franchises, tourneyGames),
          titles: buildTitles(franchises, championIds),
          shame: buildWalkOfShame(franchises, [...leagueGames, ...tourneyGames]),
          gameCount: tourneyGames.length,
        },
        tournaments,
      }
    },
    { list: [], all: { stats: [], titles: [], shame: [], gameCount: 0 }, tournaments: [] },
  )

  if (!dbReady) {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  const { list, all, tournaments } = data

  const cap = (s: string) => s.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  const panels: AnalyticsPanel[] = [
    {
      id: 'all',
      label: 'All tournaments',
      caption: `Across all tournaments · ${all.gameCount} game${all.gameCount === 1 ? '' : 's'} · 1v1 & 2v2`,
      node: (
        <TournamentDashboard
          stats={all.stats}
          titles={all.titles}
          shame={all.shame}
          gameCount={all.gameCount}
        />
      ),
    },
    ...tournaments.map((t): AnalyticsPanel => {
      const games = `${t.gameCount} game${t.gameCount === 1 ? '' : 's'}`
      if (t.triple) {
        return {
          id: t.id,
          label: t.name,
          caption: `${cap(t.status)} · Triple Threat · ${t.editions} edition${t.editions === 1 ? '' : 's'} · ${games}`,
          node: (
            <TournamentDashboard
              stats={t.stats}
              titles={t.titles}
              shame={t.shame}
              gameCount={t.gameCount}
            />
          ),
        }
      }
      return {
        id: t.id,
        label: t.name,
        caption: `${cap(t.status)} · ${t.doubles ? 'Rotating 2v2' : '1v1'} · Best of ${BEST_OF} · ${games}`,
        node: (
          <SingleTournamentPanel
            stats={t.stats}
            series={t.series}
            pairings={t.pairings}
            gameCount={t.gameCount}
            bestOf={BEST_OF}
            doubles={t.doubles}
          />
        ),
      }
    }),
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tournaments"
        icon={Trophy}
        subtitle="Analysis, brackets & champions"
        action={
          <Link
            href="/commissioner/tournaments"
            className="skeuo-btn rounded-lg px-4 py-2 text-sm font-semibold"
          >
            New Tournament
          </Link>
        }
      />

      {/* ── Analysis (all tournaments + per-tournament drill-down) ── */}
      <TournamentAnalytics panels={panels} />

      {/* ── The tournaments themselves ─────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-black uppercase tracking-tight">
          All Tournaments
        </h2>
        {list.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.id}`} className="block min-w-0">
                <GlassPanel className="group flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5">
                  <span className="skeuo grid h-12 w-12 place-items-center rounded-xl text-warning">
                    <Trophy weight="bold" size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-xl font-black uppercase tracking-tight">
                      {t.name}
                    </h3>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.participants.length ? t.participants.join(' · ') : 'No owners yet'}
                      {t.champion && ` · 🏆 ${t.champion}`}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                      t.status === 'in-progress'
                        ? 'bg-primary/15 text-primary'
                        : t.status === 'completed'
                          ? 'bg-success/15 text-success'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {t.status}
                  </span>
                  <CaretRight weight="bold" size={16} className="text-muted-foreground" />
                </GlassPanel>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Trophy}
            title="No tournaments yet"
            description="Spin up a tournament — round robin, knockout, or a full season league — then add fixtures."
            cta={
              <Link
                href="/commissioner/tournaments"
                className="skeuo-btn rounded-lg px-4 py-2 font-semibold"
              >
                Create Tournament
              </Link>
            }
          />
        )}
      </section>
    </div>
  )
}
