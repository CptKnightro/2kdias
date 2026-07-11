import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

/**
 * One-off: drop Jake, Goodwin, Lanier and Smart from AJ's (Heat) roster —
 * back to the available pool (franchise cleared, soldPrice wiped).
 *   npx tsx src/scripts/remove-heat-players.ts
 */
const DROP = [/jake/i, /goodwin/i, /lanier/i, /smart/i]

const run = async () => {
  const payload = await getPayload({ config })
  const fr = await payload.find({ collection: 'franchises', limit: 100, depth: 0 })
  const heat = fr.docs.find((f) => (f.name ?? '').toLowerCase() === 'heat')
  if (!heat) throw new Error('Heat franchise not found')

  const roster = await payload.find({
    collection: 'players',
    where: { franchise: { equals: heat.id } },
    sort: '-ovr',
    limit: 100,
    depth: 0,
  })
  console.log(`Heat roster (${roster.totalDocs}):`)
  for (const p of roster.docs) console.log(`  ${p.ovr}  ${p.name}  [${p.status}]`)

  const targets = roster.docs.filter((p) => DROP.some((rx) => rx.test(p.name ?? '')))
  console.log(`\nMatched ${targets.length}: ${targets.map((p) => p.name).join(', ')}`)

  if (targets.length !== DROP.length) {
    console.error('Expected exactly 4 matches — nothing changed.')
    process.exit(1)
  }
  if (roster.totalDocs - targets.length !== 12) {
    console.error(`Removal would leave ${roster.totalDocs - targets.length}, not 12 — nothing changed.`)
    process.exit(1)
  }

  for (const p of targets) {
    await payload.update({
      collection: 'players',
      id: p.id,
      data: { franchise: null, status: 'available', soldPrice: null },
    })
    console.log(`✓ removed ${p.name}`)
  }
  console.log(`\nHeat roster is now ${roster.totalDocs - targets.length}.`)
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
