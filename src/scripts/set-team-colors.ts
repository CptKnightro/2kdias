import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

/**
 * One-off: set the accent color on each franchise.
 * Matches franchises by team name (case-insensitive).
 *   npx tsx src/scripts/set-team-colors.ts
 */
const COLORS: Record<string, string> = {
  lakers: '#FDB927', // Lakers gold/yellow
  raptors: '#E30200', // Netflix blood red
  heat: '#98002E', // unchanged
  thunders: '#007AC1', // unchanged
  nets: '#FFFFFF', // unchanged
}

const run = async () => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'franchises', limit: 100, depth: 0 })
  for (const f of docs) {
    const key = (f.name ?? '').trim().toLowerCase()
    const color = COLORS[key]
    if (!color) {
      console.log(`• ${f.name}: no mapping — skipped`)
      continue
    }
    await payload.update({ collection: 'franchises', id: f.id, data: { color } })
    console.log(`✓ ${f.name} → ${color}`)
  }
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
