import { safeQuery } from '@/lib/payload'
import type { PlayerCardData } from '@/components/player-card'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { HomeToggle } from '@/components/home/home-toggle'
import { DashboardView } from '@/components/home/dashboard-view'
import { StatusView, type ActivityType, type StatusData } from '@/components/home/status-view'
import { LogMatchView } from '@/components/home/log-match-view'
import type { TeamStat } from '@/components/home/match-stats'
import type { RecentMatch } from '@/components/home/recent-matches'
import type { Option } from '@/components/commissioner/fields'

export const revalidate = 3600 // cached; purged on-demand via Payload hooks (src/lib/revalidate.ts)

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

const relName = (v: unknown): string | null =>
  v && typeof v === 'object' && 'name' in v ? ((v as { name?: string }).name ?? null) : null
const relColor = (v: unknown): string | null =>
  v && typeof v === 'object' && 'color' in v ? ((v as { color?: string }).color ?? null) : null
const count = (v: unknown): number => (Array.isArray(v) ? v.length : 0)

const relId = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id?: number }).id ?? null) : Number(v)

/** Roll up logged matches into per-team win/loss + points totals for the dashboard charts. */
function buildStats(
  franchises: { id: number; name: string; color?: string | null }[],
  matches: { homeFranchise: unknown; awayFranchise: unknown; homeScore?: number | null; awayScore?: number | null }[],
): TeamStat[] {
  const map = new Map<number, TeamStat>()
  for (const f of franchises) {
    map.set(f.id, {
      id: f.id,
      name: f.name,
      color: f.color ?? null,
      games: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    })
  }
  for (const m of matches) {
    const hid = relId(m.homeFranchise)
    const aid = relId(m.awayFranchise)
    const hScore = m.homeScore
    const aScore = m.awayScore
    if (hid == null || aid == null || hScore == null || aScore == null) continue
    const home = map.get(hid)
    const away = map.get(aid)
    if (!home || !away) continue
    home.games++
    away.games++
    home.pointsFor += hScore
    home.pointsAgainst += aScore
    away.pointsFor += aScore
    away.pointsAgainst += hScore
    if (hScore > aScore) {
      home.wins++
      away.losses++
    } else if (aScore > hScore) {
      away.wins++
      home.losses++
    }
  }
  return [...map.values()]
}

export default async function HomePage() {
  const { data, dbReady } = await safeQuery(
    async (payload) => {
      const [franchises, players, sold, topPlayers, activity, auctions, trades, settings, franchiseList, matches] =
        await Promise.all([
          payload.count({ collection: 'franchises' }),
          payload.count({ collection: 'players' }),
          payload.count({ collection: 'players', where: { status: { equals: 'sold' } } }),
          payload.find({ collection: 'players', sort: '-ovr', limit: 6, depth: 1 }),
          payload.find({ collection: 'activity', sort: '-createdAt', limit: 20, depth: 1 }),
          payload.find({ collection: 'auctions', sort: '-updatedAt', limit: 10, depth: 0 }),
          payload.find({ collection: 'trades', sort: '-createdAt', limit: 8, depth: 1 }),
          payload.findGlobal({ slug: 'league-settings' }),
          payload.find({ collection: 'franchises', sort: 'name', limit: 200, depth: 0 }),
          payload.find({
            collection: 'matches',
            where: { and: [{ homeScore: { exists: true } }, { awayScore: { exists: true } }] },
            sort: '-playedAt',
            limit: 1000,
            depth: 1,
          }),
        ])

      const franchiseRows = franchiseList.docs.map((f) => ({
        id: f.id as number,
        name: f.name,
        color: f.color,
      }))

      return {
        franchises: franchises.totalDocs,
        players: players.totalDocs,
        sold: sold.totalDocs,
        season: settings?.seasonName ?? 'Season 1',
        cards: topPlayers.docs.map(
          (p): PlayerCardData => ({
            name: p.name,
            ovr: p.ovr,
            position: p.position,
            nbaTeam: p.nbaTeam,
            category: p.category,
          }),
        ),
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
        franchiseOptions: franchiseRows.map((f): Option => ({ label: f.name, value: String(f.id) })),
        stats: buildStats(franchiseRows, matches.docs),
        recent: matches.docs.slice(0, 10).map(
          (m): RecentMatch => ({
            id: m.id as number,
            home: relName(m.homeFranchise) ?? '—',
            away: relName(m.awayFranchise) ?? '—',
            homeColor: relColor(m.homeFranchise),
            awayColor: relColor(m.awayFranchise),
            homeScore: m.homeScore ?? null,
            awayScore: m.awayScore ?? null,
            date: fmtDate(m.playedAt),
          }),
        ),
      }
    },
    {
      franchises: 0,
      players: 0,
      sold: 0,
      season: 'Season 1',
      cards: [] as PlayerCardData[],
      activity: [] as StatusData['activity'],
      auctions: [] as StatusData['auctions'],
      trades: [] as StatusData['trades'],
      franchiseOptions: [] as Option[],
      stats: [] as TeamStat[],
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
          franchises={data.franchises}
          players={data.players}
          sold={data.sold}
          cards={data.cards}
          stats={data.stats}
        />
      }
      status={<StatusView auctions={data.auctions} activity={data.activity} trades={data.trades} />}
      log={<LogMatchView franchiseOptions={data.franchiseOptions} recent={data.recent} />}
    />
  )
}
