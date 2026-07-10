/**
 * One-off cleanup: remove all auction records (+ their bids and auction-type
 * activity) so the auction area is a clean slate. Does NOT touch players,
 * rosters, or purses — only the auction session records. Run with:
 *   cross-env NODE_OPTIONS="--no-deprecation --import=tsx/esm" tsx src/scripts/clear-auctions.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

const run = async () => {
  const payload = await getPayload({ config })

  const auctions = await payload.find({ collection: 'auctions', limit: 1000, depth: 0 })
  console.log(`Auctions found: ${auctions.totalDocs}`)
  for (const a of auctions.docs) {
    console.log(`  • #${a.id} "${a.title}" — ${a.kind ?? '?'} / ${a.status ?? '?'}`)
  }

  // Mid-auction grant rule (mirrors deleteAuction): revert the +100 wallet grant
  // for any mid auction where no team bought anyone; keep it once a purchase happened.
  const GRANT = 100
  for (const a of auctions.docs) {
    if (a.kind !== 'mid') continue
    const queueIds = ((a.queue ?? []) as Array<number | { id: number }>).map((q) =>
      typeof q === 'object' && q ? q.id : q,
    )
    let purchases = 0
    if (queueIds.length) {
      const bought = await payload.find({
        collection: 'players',
        where: { and: [{ id: { in: queueIds } }, { franchise: { exists: true } }] },
        limit: 0,
        depth: 0,
      })
      purchases = bought.totalDocs
    }
    if (purchases === 0) {
      const fr = await payload.find({ collection: 'franchises', limit: 200, depth: 0 })
      for (const f of fr.docs) {
        await payload.update({
          collection: 'franchises',
          id: f.id,
          data: { purseTotal: Math.max(0, (f.purseTotal ?? 0) - GRANT) },
          overrideAccess: true,
        })
      }
      console.log(`  ↩︎ mid #${a.id} unused — reverted +${GRANT} grant from all teams`)
    } else {
      console.log(`  ✓ mid #${a.id} had ${purchases} purchase(s) — grant kept`)
    }
  }

  // Bids reference auctions — clear them first so nothing orphans.
  const bids = await payload.delete({ collection: 'bids', where: { id: { exists: true } } })
  console.log(`Deleted bids: ${Array.isArray(bids.docs) ? bids.docs.length : 0}`)

  const delAuctions = await payload.delete({ collection: 'auctions', where: { id: { exists: true } } })
  console.log(`Deleted auctions: ${Array.isArray(delAuctions.docs) ? delAuctions.docs.length : 0}`)

  // Auction-type activity feed entries are test noise once the auctions are gone.
  const act = await payload.delete({
    collection: 'activity',
    where: { type: { equals: 'auction' } },
  })
  console.log(`Deleted auction activity: ${Array.isArray(act.docs) ? act.docs.length : 0}`)

  console.log('Done — auction area is clean.')
  process.exit(0)
}

run().catch((e) => {
  console.error('clear-auctions failed:', e)
  process.exit(1)
})
