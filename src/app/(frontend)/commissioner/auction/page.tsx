import { getPayloadClient } from '@/lib/payload'
import { buildAuctionView } from '@/lib/auction'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { AuctionAdmin, type AuctionSummary } from './auction-admin'
import type { AuctionView, AuctionFranchise } from '@/components/auction-room'
import type { Player, Auction } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function CommissionerAuctionPage() {
  try {
    const payload = await getPayloadClient()
    const [latestRes, freeAgents, settings, franchiseRes] = await Promise.all([
      payload.find({ collection: 'auctions', sort: '-createdAt', limit: 1, depth: 1 }),
      payload.count({ collection: 'players', where: { franchise: { exists: false } } }),
      payload.findGlobal({ slug: 'league-settings' }),
      payload.find({ collection: 'franchises', sort: 'name', limit: 50, depth: 0 }),
    ])

    const sym = settings?.currencySymbol || '$'
    const suf = settings?.currencySuffix || 'M'

    const walletTeams = franchiseRes.docs.map((f) => ({
      id: String(f.id),
      name: f.name,
      color: f.color ?? null,
      purseTotal: f.purseTotal ?? 0,
    }))

    const latest = latestRes.docs[0]
    let summary: AuctionSummary = null
    let liveView: AuctionView | null = null
    let liveFranchises: AuctionFranchise[] = []

    if (latest) {
      const queuePlayers = (Array.isArray(latest.queue) ? latest.queue : []).filter(
        (q): q is Player => typeof q === 'object' && q !== null,
      )
      const resolvedCount = queuePlayers.filter(
        (p) => p.status === 'sold' || p.status === 'unsold',
      ).length
      summary = {
        id: String(latest.id),
        title: latest.title,
        kind: latest.kind === 'main' ? 'main' : 'mid',
        status: latest.status ?? 'scheduled',
        retentionOpen: !!latest.retentionOpen,
        resolvedCount,
      }
      // Build the live auctioneer view so the commissioner runs it right here.
      if (latest.status === 'live') {
        const built = await buildAuctionView(payload, latest as Auction, sym, suf)
        liveView = built.view
        liveFranchises = built.franchises
      }
    }

    return (
      <AuctionAdmin
        latest={summary}
        freeAgentCount={freeAgents.totalDocs}
        walletTeams={walletTeams}
        currencySymbol={sym}
        currencySuffix={suf}
        liveView={liveView}
        liveFranchises={liveFranchises}
      />
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
