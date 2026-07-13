import { safeQuery } from '@/lib/payload'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { HomeToggle } from '@/components/home/home-toggle'
import { DashboardView } from '@/components/home/dashboard-view'
import { StatusView, type ActivityType, type StatusData } from '@/components/home/status-view'
import { LogMatchView } from '@/components/home/log-match-view'
import {
  buildStats,
  buildHeadToHead,
  buildForm,
  buildRecords,
  buildTimeline,
  type TeamStat,
  type FranchiseRow,
  type HeadToHead,
  type FormRow,
  type Records,
  type Timeline,
} from '@/lib/home-stats'
import {
  buildWalkOfShame,
  bracketToSideGames,
  matchToSideGame,
  type SideGame,
  type ShameRow,
} from '@/lib/tournament-stats'
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

export default async function HomePage() {
  const { data, dbReady } = await safeQuery(
    async (payload) => {
      const [activity, auctions, trades, settings, franchiseList, matches, tournaments, trophies] =
        await Promise.all([
          payload.find({ collection: 'activity', sort: '-createdAt', limit: 20, depth: 1 }),
          payload.find({ collection: 'auctions', sort: '-updatedAt', limit: 10, depth: 0 }),
          payload.find({ collection: 'trades', sort: '-createdAt', limit: 8, depth: 1 }),
          payload.findGlobal({ slug: 'league-settings' }),
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
          // Tournaments — only their bracket games feed the combined Walk of Shame.
          payload.find({ collection: 'tournaments', limit: 200, depth: 0 }),
          payload.find({ collection: 'trophies', limit: 100, depth: 1 }),
        ])

      const franchiseRows: FranchiseRow[] = franchiseList.docs.map((f) => ({
        id: f.id as number,
        name: f.name,
        owner: f.ownerName ?? null,
        color: f.color ?? null,
      }))
      const matchDocs = matches.docs

      // Trophy case = every ring across all trophies, tallied per owner.
      // Team rings credit the franchise's owner; owner-type rings use the name directly.
      const ringsByOwner = new Map<string, TrophyCaseRow>()
      for (const t of trophies.docs) {
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
      const trophyCase = [...ringsByOwner.values()].sort(
        (a, b) => b.rings - a.rings || a.label.localeCompare(b.label),
      )

      // Walk of Shame = walkover losses across league matches + tournament games.
      const shame = buildWalkOfShame(franchiseRows, [
        ...matchDocs.map((m) => matchToSideGame(m)).filter((g): g is SideGame => g !== null),
        ...tournaments.docs.flatMap((t) => bracketToSideGames(t.bracket)),
      ])

      return {
        season: settings?.seasonName ?? 'Season 1',
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
        franchiseOptions: franchiseRows.map(
          (f): Option => ({ label: f.name, value: String(f.id) }),
        ),
        stats: buildStats(franchiseRows, matchDocs),
        headToHead: buildHeadToHead(franchiseRows, matchDocs),
        form: buildForm(franchiseRows, matchDocs),
        records: buildRecords(franchiseRows, matchDocs),
        timeline: buildTimeline(franchiseRows, matchDocs),
        shame,
        trophyCase,
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
            date: fmtDate(m.playedAt),
          }),
        ),
      }
    },
    {
      season: 'Season 1',
      activity: [] as StatusData['activity'],
      auctions: [] as StatusData['auctions'],
      trades: [] as StatusData['trades'],
      franchiseOptions: [] as Option[],
      stats: [] as TeamStat[],
      headToHead: { teams: [], matrix: {} } as HeadToHead,
      form: [] as FormRow[],
      records: {
        highestTeamScore: null,
        biggestBlowout: null,
        closestGame: null,
        highestScoringMatch: null,
        longestStreak: null,
      } as Records,
      timeline: { series: [], data: [] } as Timeline,
      shame: [] as ShameRow[],
      trophyCase: [] as TrophyCaseRow[],
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
        <DashboardView
          season={data.season}
          stats={data.stats}
          headToHead={data.headToHead}
          form={data.form}
          records={data.records}
          timeline={data.timeline}
          shame={data.shame}
          trophyCase={data.trophyCase}
        />
      }
      status={<StatusView auctions={data.auctions} activity={data.activity} trades={data.trades} />}
      log={<LogMatchView franchiseOptions={data.franchiseOptions} recent={data.recent} />}
    />
  )
}
