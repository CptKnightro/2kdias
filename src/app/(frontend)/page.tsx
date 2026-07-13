import { safeQuery } from '@/lib/payload'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { HomeToggle } from '@/components/home/home-toggle'
import { RingToggle } from '@/components/home/ring-toggle'
import { DashboardView, type DashboardData } from '@/components/home/dashboard-view'
import { StatusView, type ActivityType, type StatusData } from '@/components/home/status-view'
import { LogMatchView } from '@/components/home/log-match-view'
import {
  buildStats,
  buildHeadToHead,
  buildForm,
  buildRecords,
  buildTimeline,
  type FranchiseRow,
} from '@/lib/home-stats'
import {
  buildWalkOfShame,
  bracketToSideGames,
  matchToSideGame,
  type SideGame,
} from '@/lib/tournament-stats'
import { ringOf, GOAT_EXCLUDED_SLUGS, type Ring } from '@/lib/rings'
import type { Match } from '@/payload-types'
import type { RecentMatch } from '@/components/home/recent-matches'
import type { TrophyCaseRow } from '@/components/home/trophy-case'
import type { Option } from '@/components/commissioner/fields'

export const dynamic = 'force-dynamic' // never cache a transient DB blip (would be served for the whole revalidate window)

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

const relName = (v: unknown): string | null =>
  v && typeof v === 'object' && 'name' in v ? ((v as { name?: string }).name ?? null) : null
const relColor = (v: unknown): string | null =>
  v && typeof v === 'object' && 'color' in v ? ((v as { color?: string }).color ?? null) : null
const count = (v: unknown): number => (Array.isArray(v) ? v.length : 0)

const emptyDashboard = (): DashboardData => ({
  stats: [],
  headToHead: { teams: [], matrix: {} },
  form: [],
  records: {
    highestTeamScore: null,
    biggestBlowout: null,
    closestGame: null,
    highestScoringMatch: null,
    longestStreak: null,
  },
  timeline: { series: [], data: [] },
  shame: [],
  shameSubtitle: '',
  showDraws: false,
  trophyCase: [],
})

export default async function HomePage() {
  const { data, dbReady } = await safeQuery(
    async (payload) => {
      const [activity, auctions, trades, franchiseList, matches, tournaments, trophies] =
        await Promise.all([
          payload.find({ collection: 'activity', sort: '-createdAt', limit: 20, depth: 1 }),
          payload.find({ collection: 'auctions', sort: '-updatedAt', limit: 10, depth: 0 }),
          payload.find({ collection: 'trades', sort: '-createdAt', limit: 8, depth: 1 }),
          payload.find({ collection: 'franchises', sort: 'name', limit: 200, depth: 0 }),
          // League matches only — tournament games live in brackets (separate board).
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
            depth: 1,
          }),
          // Tournaments — only their bracket games feed the G.O.A.T Walk of Shame.
          payload.find({ collection: 'tournaments', limit: 200, depth: 0 }),
          payload.find({ collection: 'trophies', limit: 100, depth: 1 }),
        ])

      const toRow = (f: (typeof franchiseList.docs)[number]): FranchiseRow => ({
        id: f.id as number,
        name: f.name,
        owner: f.ownerName ?? null,
        color: f.color ?? null,
      })
      const allRows: FranchiseRow[] = franchiseList.docs.map(toRow)
      // Lash's Lakers sit out the G.O.A.T Ring — drop them from every goat view.
      const goatRows: FranchiseRow[] = franchiseList.docs
        .filter((f) => !GOAT_EXCLUDED_SLUGS.includes((f.slug ?? '').toLowerCase()))
        .map(toRow)

      // League matches split by ring — rows that predate the ring column count as G.O.A.T.
      const goatMatches = matches.docs.filter((m) => ringOf(m.ring) === 'goat')
      const twoKMatches = matches.docs.filter((m) => ringOf(m.ring) === '2k')

      // Trophy case = ring tally per owner from RECURRING trophies of the given
      // competition (e.g. G.O.A.T rings). Final trophies are one-off honours —
      // they live on the Trophies page, not in this count. Team rings credit
      // the franchise's owner; owner-type rings use the name directly.
      const trophyCaseFor = (ring: Ring): TrophyCaseRow[] => {
        const ringsByOwner = new Map<string, TrophyCaseRow>()
        for (const t of trophies.docs.filter(
          (t) => t.kind === 'recurring' && ringOf(t.ring) === ring,
        )) {
          for (const w of t.winners ?? []) {
            const isOwner = w.winnerType === 'owner'
            const franchise = typeof w.franchise === 'object' ? w.franchise : null
            const label = (isOwner ? w.ownerName : (franchise?.ownerName ?? franchise?.name)) ?? '—'
            const row = ringsByOwner.get(label) ?? {
              label,
              color: isOwner ? null : (franchise?.color ?? null),
              rings: 0,
            }
            row.rings += 1
            ringsByOwner.set(label, row)
          }
        }
        return [...ringsByOwner.values()].sort(
          (a, b) => b.rings - a.rings || a.label.localeCompare(b.label),
        )
      }

      const sideGames = (ms: Match[]): SideGame[] =>
        ms.map((m) => matchToSideGame(m)).filter((g): g is SideGame => g !== null)

      // One fully-built dashboard per ring — RingToggle swaps them client-side.
      const bundle = (
        rows: FranchiseRow[],
        ms: Match[],
        games: SideGame[],
        ring: Ring,
        shameSubtitle: string,
      ): DashboardData => ({
        stats: buildStats(rows, ms),
        headToHead: buildHeadToHead(rows, ms),
        form: buildForm(rows, ms),
        records: buildRecords(rows, ms),
        timeline: buildTimeline(rows, ms),
        shame: buildWalkOfShame(rows, games),
        shameSubtitle,
        // Only 2K games can end level — its view shows W-L-D for everyone.
        showDraws: ring === '2k',
        trophyCase: trophyCaseFor(ring),
      })

      return {
        activity: activity.docs.map((a) => ({
          id: a.id as number,
          type: (a.type ?? 'system') as ActivityType,
          message: a.message,
          franchiseName: relName(a.franchise),
          franchiseColor: relColor(a.franchise),
          date: fmtDate(a.createdAt),
        })),
        auctions: auctions.docs.map((a) => ({
          id: a.id as number,
          title: a.title,
          status: a.status ?? 'scheduled',
          queueCount: count(a.queue),
        })),
        trades: trades.docs.map((t) => ({
          id: t.id as number,
          fromName: relName(t.fromFranchise) ?? '—',
          toName: relName(t.toFranchise) ?? '—',
          status: t.status ?? 'proposed',
          offeredCount: count(t.offeredPlayers),
          requestedCount: count(t.requestedPlayers),
          date: fmtDate(t.createdAt),
        })),
        franchiseOptions: allRows.map((f): Option => ({ label: f.name, value: String(f.id) })),
        goatFranchiseOptions: goatRows.map(
          (f): Option => ({ label: f.name, value: String(f.id) }),
        ),
        // Bracket tournaments (OG) were played by the G.O.A.T crew, so their
        // walkovers count on the goat side only.
        goat: bundle(
          goatRows,
          goatMatches,
          [
            ...sideGames(goatMatches),
            ...tournaments.docs.flatMap((t) => bracketToSideGames(t.bracket)),
          ],
          'goat',
          'G.O.A.T Ring + tournaments combined',
        ),
        twoK: bundle(
          allRows,
          twoKMatches,
          sideGames(twoKMatches),
          '2k',
          '2K Championship Ring matches',
        ),
        recent: matches.docs.slice(0, 10).map(
          (m): RecentMatch => ({
            id: m.id as number,
            home: relName(m.homeFranchise) ?? '—',
            away: relName(m.awayFranchise) ?? '—',
            homeColor: relColor(m.homeFranchise),
            awayColor: relColor(m.awayFranchise),
            homeScore: m.homeScore ?? null,
            awayScore: m.awayScore ?? null,
            walkover: !!m.walkover,
            ring: ringOf(m.ring),
            date: fmtDate(m.playedAt),
          }),
        ),
      }
    },
    {
      activity: [] as StatusData['activity'],
      auctions: [] as StatusData['auctions'],
      trades: [] as StatusData['trades'],
      franchiseOptions: [] as Option[],
      goatFranchiseOptions: [] as Option[],
      goat: emptyDashboard(),
      twoK: emptyDashboard(),
      recent: [] as RecentMatch[],
    },
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
    <HomeToggle
      dashboard={
        <RingToggle
          goat={<DashboardView {...data.goat} />}
          twoK={<DashboardView {...data.twoK} />}
        />
      }
      status={<StatusView auctions={data.auctions} activity={data.activity} trades={data.trades} />}
      log={
        <LogMatchView
          franchiseOptions={data.franchiseOptions}
          goatFranchiseOptions={data.goatFranchiseOptions}
          recent={data.recent}
        />
      }
    />
  )
}
