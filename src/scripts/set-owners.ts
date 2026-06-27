import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

/**
 * One-off: set the display owner name on each franchise.
 * Matches franchises by team name (case-insensitive). Run after the
 * `franchises_owner_name` migration:  npx tsx src/scripts/set-owners.ts
 */
const OWNERS: Record<string, string> = {
  lakers: 'Lash',
  nets: 'Bava',
  raptors: 'Mandy',
  heat: 'AJ',
  thunders: 'OM', // OKC
}

const run = async () => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'franchises', limit: 100, depth: 0 })
  for (const f of docs) {
    const key = (f.name ?? '').trim().toLowerCase()
    const ownerName = OWNERS[key]
    if (!ownerName) {
      console.log(`• ${f.name}: no mapping — skipped`)
      continue
    }
    await payload.update({ collection: 'franchises', id: f.id, data: { ownerName } })
    console.log(`✓ ${f.name} → ${ownerName}`)
  }
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
