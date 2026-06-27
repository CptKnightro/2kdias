/**
 * Read-only: inspect the Nowitzki/Tatum trade + the two players' current teams.
 * Run: cross-env NODE_OPTIONS="--no-deprecation --import=tsx/esm" tsx src/scripts/inspect-trade.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

const run = async () => {
  const payload = await getPayload({ config })

  const players = await payload.find({
    collection: 'players',
    where: { or: [{ name: { like: 'Nowitzki' } }, { name: { like: 'Tatum' } }] },
    depth: 1,
    limit: 20,
  })
  console.log('— Players —')
  for (const p of players.docs) {
    const f = p.franchise
    const fname = f && typeof f === 'object' ? f.name : f
    console.log(`  #${p.id} ${p.name} · ovr ${p.ovr} · franchise: ${fname ?? '—'} (id ${f && typeof f === 'object' ? f.id : f})`)
  }

  const trades = await payload.find({ collection: 'trades', depth: 1, limit: 50, sort: '-createdAt' })
  console.log(`\n— Trades (${trades.totalDocs}) —`)
  for (const t of trades.docs) {
    const from = typeof t.fromFranchise === 'object' ? t.fromFranchise?.name : t.fromFranchise
    const to = typeof t.toFranchise === 'object' ? t.toFranchise?.name : t.toFranchise
    const off = (Array.isArray(t.offeredPlayers) ? t.offeredPlayers : [])
      .map((p) => (typeof p === 'object' ? p?.name : p))
      .join(', ')
    const req = (Array.isArray(t.requestedPlayers) ? t.requestedPlayers : [])
      .map((p) => (typeof p === 'object' ? p?.name : p))
      .join(', ')
    console.log(
      `  #${t.id} [${t.status}] ${from} → ${to}\n      offered: ${off || '—'}\n      requested: ${req || '—'}\n      expiresAt: ${t.expiresAt ?? '—'}`,
    )
  }

  process.exit(0)
}

run().catch((e) => {
  console.error('inspect-trade failed:', e)
  process.exit(1)
})
