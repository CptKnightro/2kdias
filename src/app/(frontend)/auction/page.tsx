import { headers as nextHeaders } from 'next/headers'
import Link from 'next/link'
import { Gavel, Crown } from '@phosphor-icons/react/dist/ssr'
import { getPayloadClient, withDbRetry } from '@/lib/payload'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import {
  AuctionRoom,
  type AuctionView,
  type AuctionFranchise,
  type Me,
  type PoolPlayer,
  type HistoryPlayer,
} from '@/components/auction-room'
import { AuctionResults } from '@/components/auction/auction-results'
import { RetentionPhase, type RetentionTeam, type RosterPlayer } from '@/components/auction/retention-phase'
import type { Player } from '@/payload-types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Auction Room' }

export default async function AuctionPage() {
  try {
    return await withDbRetry(async () => {
      const payload = await getPayloadClient()
      const headers = await nextHeaders()
      const { user } = await payload.auth({ headers })
      const isCommish = user?.role === 'commissioner'
      const myFranchiseId = user
        ? typeof user.franchise === 'object'
          ? (user.franchise?.id ?? null)
          : (user.franchise ?? null)
        : null

      const settings = await payload.findGlobal({ slug: 'league-settings' })
      const sym = settings?.currencySymbol || '$'
      const suf = settings?.currencySuffix || 'M'

      // latest auction: newest live, else newest overall
      const live = await payload.find({
        collection: 'auctions',
        where: { status: { equals: 'live' } },
        sort: '-updatedAt',
        limit: 1,
        depth: 1,
      })
      const latest =
        live.docs[0] ??
        (await payload.find({ collection: 'auctions', sort: '-createdAt', limit: 1, depth: 1 })).docs[0]

      const me: Me = user
        ? {
            userId: String(user.id),
            role: (user.role as 'commissioner' | 'owner') ?? 'owner',
            franchiseId: myFranchiseId != null ? String(myFranchiseId) : null,
          }
        : null

      // ── Phase: EMPTY (no auction, or cleared) ─────────────────────────────
      const renderEmpty = (subtitle: string) => (
        <div>
          <PageHeader title="Auction Room" icon={Gavel} subtitle={subtitle} />
          <EmptyState
            icon={Gavel}
            title="No auction live"
            description={
              isCommish
                ? 'Open a Main or Mid auction from the Commissioner area to get started.'
                : 'The commissioner will open the next auction soon.'
            }
          />
          {isCommish && (
            <div className="mt-4 flex justify-center">
              <Link
                href="/commissioner/auction"
                className="skeuo-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                <Crown weight="bold" size={16} /> Set up an auction
              </Link>
            </div>
          )}
        </div>
      )

      if (!latest) return renderEmpty('No auction yet')

      const franchiseRes = await payload.find({
        collection: 'franchises',
        limit: 50,
        depth: 1,
        sort: 'name',
      })
      const franchiseById = new Map(franchiseRes.docs.map((f) => [f.id, f]))

      // ── Phase: RETENTION (main auction, window open, not yet ended) ───────
      if (latest.kind === 'main' && latest.retentionOpen && latest.status !== 'ended') {
        const limit = latest.retentionLimit ?? 3
        const teams: RetentionTeam[] = await Promise.all(
          franchiseRes.docs.map(async (f) => {
            const [roster, retained] = await Promise.all([
              payload.count({ collection: 'players', where: { franchise: { equals: f.id } } }),
              payload.count({
                collection: 'players',
                where: { and: [{ franchise: { equals: f.id } }, { retained: { equals: true } }] },
              }),
            ])
            return {
              id: String(f.id),
              name: f.name,
              color: f.color,
              retainedCount: retained.totalDocs,
              rosterCount: roster.totalDocs,
            }
          }),
        )

        let myRoster: RosterPlayer[] = []
        if (myFranchiseId) {
          const rs = await payload.find({
            collection: 'players',
            where: { franchise: { equals: myFranchiseId } },
            sort: '-ovr',
            limit: 100,
            depth: 0,
          })
          myRoster = rs.docs.map((p) => ({
            id: String(p.id),
            name: p.name,
            ovr: p.ovr,
            position: p.position,
            retained: !!p.retained,
          }))
        }
        const myFranchiseName = franchiseRes.docs.find((f) => f.id === myFranchiseId)?.name ?? null

        return (
          <div>
            <PageHeader
              title="Auction Room"
              icon={Gavel}
              subtitle={`Main auction · retention open · ${latest.title}`}
            />
            <RetentionPhase
              auctionId={String(latest.id)}
              retentionLimit={limit}
              retentionDeadline={latest.retentionDeadline ?? null}
              isCommish={!!isCommish}
              myFranchiseName={myFranchiseName}
              myRoster={myRoster}
              teams={teams}
            />
          </div>
        )
      }

      // ── Derive pool (available) + history (resolved) from the queue ───────
      const currentPlayerId =
        typeof latest.currentPlayer === 'object' ? latest.currentPlayer?.id : latest.currentPlayer
      const queuePlayers = (Array.isArray(latest.queue) ? latest.queue : []).filter(
        (q): q is Player => typeof q === 'object' && q !== null,
      )
      const resolved = (p: Player) => p.status === 'sold' || p.status === 'unsold'

      const pool: PoolPlayer[] = queuePlayers
        .filter((p) => !resolved(p) && p.id !== currentPlayerId)
        .map((p) => ({ id: String(p.id), name: p.name, ovr: p.ovr, position: p.position }))

      const history: HistoryPlayer[] = queuePlayers
        .filter(resolved)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map((p) => {
          if (p.status === 'sold') {
            const fid = typeof p.franchise === 'object' ? p.franchise?.id : p.franchise
            const f = fid != null ? franchiseById.get(fid) : null
            return {
              id: String(p.id),
              name: p.name,
              ovr: p.ovr,
              position: p.position,
              result: 'sold' as const,
              franchiseName: f?.name ?? null,
              color: f?.color ?? null,
              price: p.soldPrice ?? null,
            }
          }
          return {
            id: String(p.id),
            name: p.name,
            ovr: p.ovr,
            position: p.position,
            result: 'unsold' as const,
          }
        })

      const kindLabel = latest.kind === 'main' ? 'Main' : 'Mid'

      // ── Phase: ENDED → results recap (or empty once cleared) ──────────────
      if (latest.status === 'ended') {
        if (history.length === 0) return renderEmpty('Last auction cleared')
        return (
          <div>
            <PageHeader
              title="Auction Room"
              icon={Gavel}
              subtitle={`${kindLabel} auction · Results · ${latest.title}`}
            />
            <AuctionResults
              title={latest.title}
              history={history}
              currencySymbol={sym}
              currencySuffix={suf}
            />
          </div>
        )
      }

      // Scheduled / idle but not live → nothing to show yet.
      if (latest.status !== 'live') return renderEmpty('Setting up the next auction…')

      // ── Phase: LIVE ───────────────────────────────────────────────────────
      const rosterCounts = await Promise.all(
        franchiseRes.docs.map((f) =>
          payload.count({ collection: 'players', where: { franchise: { equals: f.id } } }),
        ),
      )
      const franchises: AuctionFranchise[] = franchiseRes.docs.map((f, i) => ({
        id: String(f.id),
        name: f.name,
        color: f.color,
        purseTotal: f.purseTotal ?? 0,
        purseSpent: f.purseSpent ?? 0,
        rosterCount: rosterCounts[i].totalDocs,
      }))

      const bidRes = await payload.find({
        collection: 'bids',
        where: { auction: { equals: latest.id } },
        sort: '-createdAt',
        limit: 8,
        depth: 1,
      })
      const recentBids = bidRes.docs.map((b) => ({
        id: String(b.id),
        amount: b.amount,
        franchiseName: typeof b.franchise === 'object' ? (b.franchise?.name ?? '—') : '—',
      }))

      const cp = typeof latest.currentPlayer === 'object' ? latest.currentPlayer : null
      const hf = typeof latest.currentHighFranchise === 'object' ? latest.currentHighFranchise : null

      const view: AuctionView = {
        id: String(latest.id),
        kind: latest.kind === 'main' ? 'main' : 'mid',
        status: latest.status ?? 'scheduled',
        lotStatus: latest.lotStatus ?? 'idle',
        currentHighBid: latest.currentHighBid ?? null,
        minIncrement: latest.minIncrement ?? 1,
        currencySymbol: sym,
        currencySuffix: suf,
        currentPlayer: cp
          ? {
              id: String(cp.id),
              name: cp.name,
              ovr: cp.ovr,
              position: cp.position,
              nbaTeam: cp.nbaTeam,
              category: cp.category,
            }
          : null,
        highFranchiseId: hf ? String(hf.id) : null,
        highFranchiseName: hf?.name ?? null,
        recentBids,
        pool,
        history,
      }

      return (
        <div>
          <PageHeader
            title="Auction Room"
            icon={Gavel}
            subtitle={`${kindLabel} auction · Live now · ${latest.title}`}
          />
          <AuctionRoom auction={view} franchises={franchises} me={me} canEnd={!!isCommish} />
        </div>
      )
    })
  } catch (err) {
    console.error('[auction] render failed', err)
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }
}
