/**
 * Prepare the mid-season auction:
 *  1. Set scaled mid base prices on every pool player (not on a roster), by OVR band.
 *  2. Top up each franchise's purse by +200 (carryover preserved). Guarded so it
 *     won't double-apply: skips any franchise already above the 600 main budget.
 * Read-safe to re-run for base prices; the top-up self-guards.
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

const GRANT = 100

// [minInclusive, maxExclusive, price]
const BANDS: [number, number, number][] = [
  [99, 999, 30],
  [96, 99, 20],
  [92, 96, 12],
  [88, 92, 8],
  [84, 88, 5],
  [80, 84, 3],
  [76, 80, 2],
  [0, 76, 1],
]

const run = async () => {
  const payload = await getPayload({ config })

  console.log('=== 1) Base prices on the pool (franchise unset) ===')
  let priced = 0
  for (const [lo, hi, price] of BANDS) {
    const res = await payload.update({
      collection: 'players',
      where: {
        and: [
          { franchise: { exists: false } },
          { ovr: { greater_than_equal: lo } },
          { ovr: { less_than: hi } },
        ],
      },
      data: { basePrice: price },
    })
    const n = Array.isArray(res.docs) ? res.docs.length : 0
    priced += n
    console.log(`  OVR ${lo}-${hi === 999 ? '99+' : hi - 1}: $${price} -> ${n} players`)
  }
  console.log(`  total pool priced: ${priced}`)

  console.log(
    '\nDone. Pool base prices set. The +' +
      GRANT +
      ' wallet grant is applied automatically when the mid auction starts (createMidAuction).',
  )
  process.exit(0)
}

run().catch((e) => { console.error('prepare-mid-auction failed:', e); process.exit(1) })
