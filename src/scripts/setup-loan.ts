/**
 * One-off: turn trade #3 (Nowitzki ↔ Tatum) into an active week-long loan
 * starting yesterday, the 27th. Sets the loan window and moves the players to
 * the other team for the duration (they revert automatically once it ends).
 *
 * Run: cross-env NODE_OPTIONS="--no-deprecation --import=tsx/esm" tsx src/scripts/setup-loan.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

const TRADE_ID = 3
const STARTS_AT = '2026-06-27T00:00:00.000Z'
const ENDS_AT = '2026-07-04T00:00:00.000Z' // one week from the 27th

const numId = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id: number }).id ?? null) : Number(v)
const idList = (v: unknown): number[] =>
  Array.isArray(v) ? v.map(numId).filter((x): x is number => x != null) : []

const run = async () => {
  const payload = await getPayload({ config })

  const trade = await payload.findByID({ collection: 'trades', id: TRADE_ID, depth: 0 })
  const from = numId(trade.fromFranchise)
  const to = numId(trade.toFranchise)
  const offered = idList(trade.offeredPlayers) // start on `from`, loaned to `to`
  const requested = idList(trade.requestedPlayers) // start on `to`, loaned to `from`
  if (from == null || to == null) throw new Error('Trade is missing a franchise')

  console.log(`Trade #${TRADE_ID}: from ${from} → to ${to}`)
  console.log(`  offered (→ ${to}): ${offered.join(', ') || '—'}`)
  console.log(`  requested (→ ${from}): ${requested.join(', ') || '—'}`)

  // Stamp the loan window + ensure it's marked accepted (active).
  await payload.update({
    collection: 'trades',
    id: TRADE_ID,
    data: { status: 'accepted', startsAt: STARTS_AT, endsAt: ENDS_AT },
    overrideAccess: true,
  })

  // Activate the swap: offered players go to `to`, requested players go to `from`.
  if (offered.length)
    await payload.update({
      collection: 'players',
      where: { id: { in: offered } },
      data: { franchise: to },
      overrideAccess: true,
    })
  if (requested.length)
    await payload.update({
      collection: 'players',
      where: { id: { in: requested } },
      data: { franchise: from },
      overrideAccess: true,
    })

  // Verify.
  const check = await payload.find({
    collection: 'players',
    where: { id: { in: [...offered, ...requested] } },
    depth: 1,
    limit: 20,
  })
  console.log('\nAfter swap:')
  for (const p of check.docs) {
    const f = p.franchise
    console.log(`  ${p.name} → ${f && typeof f === 'object' ? f.name : f}`)
  }
  console.log(`\nLoan window: ${STARTS_AT} → ${ENDS_AT} (active now, reverts on Jul 4)`)
  process.exit(0)
}

run().catch((e) => {
  console.error('setup-loan failed:', e)
  process.exit(1)
})
