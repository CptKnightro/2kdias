import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

/**
 * One-off: reset every franchise purse. Owners listed here keep that amount
 * (as purseTotal with zero spent); every other franchise drops to zero.
 * Matches franchises by owner name (case-insensitive).
 *   npx tsx src/scripts/reset-purses.ts
 */
const PURSES: Record<string, number> = {
  aj: 20,
  staines: 10,
}

const run = async () => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'franchises', limit: 100, depth: 0 })
  for (const f of docs) {
    const key = (f.ownerName ?? '').trim().toLowerCase()
    const total = PURSES[key] ?? 0
    await payload.update({
      collection: 'franchises',
      id: f.id,
      data: { purseTotal: total, purseSpent: 0 },
    })
    console.log(`✓ ${f.name} (${f.ownerName ?? 'no owner'}) → total ${total}, spent 0`)
  }
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
