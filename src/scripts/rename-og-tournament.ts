/**
 * One-off: rename the "G.O.A.T" tournament to "OG".
 * Run: NODE_OPTIONS="--no-deprecation --import=tsx/esm" npx tsx src/scripts/rename-og-tournament.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

const run = async () => {
  const payload = await getPayload({ config })
  const tourneys = await payload.find({ collection: 'tournaments', limit: 200, depth: 0 })

  let renamed = 0
  for (const t of tourneys.docs) {
    if (t.name.trim().toUpperCase().replace(/\./g, '') === 'GOAT') {
      await payload.update({
        collection: 'tournaments',
        id: t.id,
        overrideAccess: true,
        data: { name: 'OG' },
      })
      console.log(`  #${t.id}: "${t.name}" → "OG"`)
      renamed++
    }
  }
  console.log(renamed ? `Done — renamed ${renamed}.` : 'No G.O.A.T tournament found.')
  process.exit(0)
}

run().catch((e) => {
  console.error('rename failed:', e)
  process.exit(1)
})
