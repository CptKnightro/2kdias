import { getPayloadClient } from '@/lib/payload'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { AuctionAdmin, type AuctionSummary } from './auction-admin'
import type { Player } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function CommissionerAuctionPage() {
  try {
    const payload = await getPayloadClient()
    const [latestRes, freeAgents] = await Promise.all([
      payload.find({ collection: 'auctions', sort: '-createdAt', limit: 1, depth: 1 }),
      payload.count({ collection: 'players', where: { franchise: { exists: false } } }),
    ])

    const latest = latestRes.docs[0]
    let summary: AuctionSummary = null
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
    }

    return <AuctionAdmin latest={summary} freeAgentCount={freeAgents.totalDocs} />
  } catch {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }
}
