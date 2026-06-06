import { headers as nextHeaders } from 'next/headers'
import Link from 'next/link'
import { Gavel } from '@phosphor-icons/react/dist/ssr'
import { getPayloadClient } from '@/lib/payload'
import { PageHeader, EmptyState, SetupBanner } from '@/components/ui-bits'
import {
  AuctionRoom,
  type AuctionView,
  type AuctionFranchise,
  type Me,
} from '@/components/auction-room'
import type { Player } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Auction Room' }

export default async function AuctionPage() {
  let dbReady = true
  try {
    const payload = await getPayloadClient()
    const headers = await nextHeaders()
    const { user } = await payload.auth({ headers })

    const settings = await payload.findGlobal({ slug: 'league-settings' })
    const sym = settings?.currencySymbol || '$'
    const suf = settings?.currencySuffix || 'M'

    // newest live auction, else newest auction
    const live = await payload.find({
      collection: 'auctions',
      where: { status: { equals: 'live' } },
      sort: '-updatedAt',
      limit: 1,
      depth: 1,
    })
    const latest =
      live.docs[0] ??
      (await payload.find({ collection: 'auctions', sort: '-createdAt', limit: 1, depth: 1 }))
        .docs[0]

    const franchiseRes = await payload.find({ collection: 'franchises', limit: 50, depth: 1 })
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

    const me: Me = user
      ? {
          userId: String(user.id),
          role: (user.role as 'commissioner' | 'owner') ?? 'owner',
          franchiseId:
            typeof user.franchise === 'object'
              ? user.franchise?.id != null
                ? String(user.franchise.id)
                : null
              : user.franchise != null
                ? String(user.franchise)
                : null,
        }
      : null

    if (!latest) {
      return (
        <div>
          <PageHeader title="Auction Room" icon={Gavel} subtitle="Live bidding" />
          <EmptyState
            icon={Gavel}
            title="No auction set up yet"
            description="Create an auction in the commissioner panel, add players to its queue, then come back to run it live."
            cta={
              <Link href="/admin/collections/auctions/create" className="skeuo-btn rounded-lg px-4 py-2 font-semibold">
                Create Auction
              </Link>
            }
          />
        </div>
      )
    }

    // recent bids
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
    const hf =
      typeof latest.currentHighFranchise === 'object' ? latest.currentHighFranchise : null

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

    return (
      <div>
        <PageHeader
          title="Auction Room"
          icon={Gavel}
          subtitle={`${view.status === 'live' ? 'Live now' : 'Latest auction'} · ${latest.title}`}
        />
        <AuctionRoom auction={view} franchises={franchises} me={me} />
      </div>
    )
  } catch {
    dbReady = false
  }

  if (!dbReady) {
    return (
      <div>
        <PageHeader title="Auction Room" icon={Gavel} />
        <SetupBanner />
      </div>
    )
  }
  return null
}
