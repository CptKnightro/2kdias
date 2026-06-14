import { safeQuery } from '@/lib/payload'
import type { PlayerCardData } from '@/components/player-card'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { HomeToggle } from '@/components/home/home-toggle'
import { DashboardView } from '@/components/home/dashboard-view'
import { StatusView, type ActivityType, type StatusData } from '@/components/home/status-view'

export const revalidate = 3600 // cached; purged on-demand via Payload hooks (src/lib/revalidate.ts)

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
      const [franchises, players, sold, topPlayers, activity, auctions, trades, settings] =
        await Promise.all([
          payload.count({ collection: 'franchises' }),
          payload.count({ collection: 'players' }),
          payload.count({ collection: 'players', where: { status: { equals: 'sold' } } }),
          payload.find({ collection: 'players', sort: '-ovr', limit: 6, depth: 1 }),
          payload.find({ collection: 'activity', sort: '-createdAt', limit: 20, depth: 1 }),
          payload.find({ collection: 'auctions', sort: '-updatedAt', limit: 10, depth: 0 }),
          payload.find({ collection: 'trades', sort: '-createdAt', limit: 8, depth: 1 }),
          payload.findGlobal({ slug: 'league-settings' }),
        ])

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
        />
      }
      status={<StatusView auctions={data.auctions} activity={data.activity} trades={data.trades} />}
    />
  )
}
