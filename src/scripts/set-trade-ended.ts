/**
 * One-off: stamp trade #1 (Tatum ↔ Curry) as a loan that ended yesterday, the
 * 27th — so the board shows it with an "Ended" tag + the end date. No players
 * move (it's already finished); this only sets the display date.
 *
 * Run: cross-env NODE_OPTIONS="--no-deprecation --import=tsx/esm" tsx src/scripts/set-trade-ended.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

const TRADE_ID = 1
const ENDED_AT = '2026-06-27T00:00:00.000Z' // yesterday

const run = async () => {
  const payload = await getPayload({ config })
  await payload.update({
    collection: 'trades',
    id: TRADE_ID,
    data: { status: 'expired', endsAt: ENDED_AT },
    overrideAccess: true,
  })
  const t = await payload.findByID({ collection: 'trades', id: TRADE_ID, depth: 0 })
  console.log(`Trade #${TRADE_ID}: status=${t.status} endsAt=${t.endsAt}`)
  process.exit(0)
}

run().catch((e) => {
  console.error('set-trade-ended failed:', e)
  process.exit(1)
})
