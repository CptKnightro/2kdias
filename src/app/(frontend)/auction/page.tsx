import { headers as nextHeaders } from 'next/headers'
import { Gavel } from '@phosphor-icons/react/dist/ssr'
import { getPayloadClient } from '@/lib/payload'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import {
  AuctionRoom,
  type AuctionView,
  type AuctionFranchise,
  type Me,
} from '@/components/auction-room'
import { AuctionSetup } from '@/components/auction/auction-setup'
import { RetentionPhase, type RetentionTeam, type RosterPlayer } from '@/components/auction/retention-phase'
import type { Player } from '@/payload-types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Auction Room' }

export default async function AuctionPage() {
  try {
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

    // ── Phase: SETUP (no live/retention auction running) ──────────────────────
    const renderSetup = async (subtitle: string) => {
      const freeAgents = await payload.count({
        collection: 'players',
        where: { franchise: { exists: false } },
      })
      return (
        <div>
          <PageHeader title="Auction Room" icon={Gavel} subtitle={subtitle} />
          {isCommish ? (
            <AuctionSetup freeAgentCount={freeAgents.totalDocs} />
          ) : (
            <EmptyState
              icon={Gavel}
              title="No auction running"
              description="The commissioner will open the next auction soon."
            />
          )}
        </div>
      )
    }

    if (!latest) return renderSetup('Set up an auction')

    const franchiseRes = await payload.find({
      collection: 'franchises',
      limit: 50,
      depth: 1,
      sort: 'name',
    })

    // ── Phase: RETENTION (main auction, window open, not yet ended) ───────────
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
      const myFranchiseName =
        franchiseRes.docs.find((f) => f.id === myFranchiseId)?.name ?? null

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

    // Not live and not in retention → idle/scheduled/ended → show setup.
    if (latest.status !== 'live') {
      return renderSetup(latest.status === 'ended' ? 'Last auction ended' : 'Set up an auction')
    }

    // ── Phase: LIVE ───────────────────────────────────────────────────────────
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

    const queue = (Array.isArray(latest.queue) ? latest.queue : [])
      .filter((q): q is Player => typeof q === 'object' && q !== null)
      .filter((q) => q.status !== 'sold')
      .map((q) => ({ id: String(q.id), name: q.name, ovr: q.ovr, position: q.position }))

    const view: AuctionView = {
      id: String(latest.id),
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
      queue,
    }

    const kindLabel = latest.kind === 'main' ? 'Main' : 'Mid'
    return (
      <div>
        <PageHeader
          title="Auction Room"
          icon={Gavel}
          subtitle={`${view.status === 'live' ? `${kindLabel} auction · Live now` : 'Latest auction'} · ${latest.title}`}
        />
        <AuctionRoom auction={view} franchises={franchises} me={me} canEnd={!!isCommish} />
      </div>
    )
  } catch {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }
}
