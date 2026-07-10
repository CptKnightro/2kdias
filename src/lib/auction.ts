import 'server-only'
import type { Payload } from 'payload'
import type { Auction, Player } from '@/payload-types'
import type {
  AuctionView,
  AuctionFranchise,
  PoolPlayer,
  HistoryPlayer,
} from '@/components/auction-room'

/**
 * Build the live-auction view (current lot, derived pool + history, purses, and
 * recent bids) from a `depth:1` auction doc. Shared by the public auction room
 * and the commissioner's auctioneer room so both render identical state.
 */
export async function buildAuctionView(
  payload: Payload,
  latest: Auction,
  currencySymbol: string,
  currencySuffix: string,
): Promise<{ view: AuctionView; franchises: AuctionFranchise[] }> {
  const franchiseRes = await payload.find({
    collection: 'franchises',
    limit: 50,
    depth: 1,
    sort: 'name',
  })
  const franchiseById = new Map(franchiseRes.docs.map((f) => [f.id, f]))

  // Derive pool (available) + history (resolved) from the queue.
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
    currencySymbol,
    currencySuffix,
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

  return { view, franchises }
}
