import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

/**
 * One-off: bump specific players' OVR. soldPrice / franchise are untouched, so
 * owned players stay on their team — the teams page recomputes Team OVR live.
 *   npx cross-env NODE_OPTIONS="--no-deprecation --import=tsx/esm" tsx src/scripts/set-ovr.ts
 */
const UPDATES: { id: number; ovr: number }[] = [
  { id: 390, ovr: 99 }, // Grant Hill
  { id: 69, ovr: 96 }, // Penny Hardaway
]

const run = async () => {
  const payload = await getPayload({ config })
  for (const { id, ovr } of UPDATES) {
    const before = await payload.findByID({ collection: 'players', id, depth: 0 })
    const after = await payload.update({ collection: 'players', id, data: { ovr }, overrideAccess: true })
    const fr = after.franchise && typeof after.franchise === 'object' ? after.franchise.name : after.franchise
    console.log(`✓ #${id} ${after.name}: ovr ${before.ovr} → ${after.ovr} (owner: ${fr ?? 'none'})`)
  }
  process.exit(0)
}
run().catch((e) => {
  console.error(e)
  process.exit(1)
})
