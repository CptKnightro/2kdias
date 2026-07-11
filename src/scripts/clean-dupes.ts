import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

/**
 * One-off: remove same-person duplicate player entries and fix a few malformed
 * names. Every DELETE target is asserted `available` first, so nothing a
 * franchise already owns can be removed. Idempotent-ish: re-running after a
 * successful pass simply reports the rows as already gone.
 *   npx cross-env NODE_OPTIONS="--no-deprecation --import=tsx/esm" tsx src/scripts/clean-dupes.ts
 */
const RENAMES: { id: number; to: string }[] = [
  { id: 260, to: 'Herbert Jones' }, // was "Herb Jones" (keep the 81 rating)
  { id: 47, to: 'Tyrese Haliburton' }, // fix double-L spelling
  { id: 60, to: 'Karl-Anthony Towns' }, // fix hyphenation
]

// Duplicates to delete — each must currently be `available`.
const DELETES: { id: number; why: string }[] = [
  { id: 318, why: 'dup of #260 Herbert Jones' },
  { id: 49, why: 'dup of #47 Tyrese Haliburton (All-Star card)' },
  { id: 22, why: 'dup of #14 Kareem Abdul-Jabbar' },
  { id: 21, why: 'dup of #20 Giannis Antetokounmpo' },
]

const getPlayer = async (payload: Awaited<ReturnType<typeof getPayload>>, id: number) => {
  try {
    return await payload.findByID({ collection: 'players', id, depth: 0 })
  } catch {
    return null
  }
}

const run = async () => {
  const payload = await getPayload({ config })

  for (const { id, to } of RENAMES) {
    const p = await getPlayer(payload, id)
    if (!p) {
      console.log(`skip rename #${id}: not found`)
      continue
    }
    if (p.name === to) {
      console.log(`ok rename #${id}: already "${to}"`)
      continue
    }
    await payload.update({ collection: 'players', id, data: { name: to }, overrideAccess: true })
    console.log(`✓ renamed #${id} "${p.name}" → "${to}"`)
  }

  for (const { id, why } of DELETES) {
    const p = await getPlayer(payload, id)
    if (!p) {
      console.log(`skip delete #${id}: already gone`)
      continue
    }
    if (p.status !== 'available') {
      console.log(`REFUSE delete #${id} "${p.name}": status=${p.status} (not available) — ${why}`)
      continue
    }
    await payload.delete({ collection: 'players', id, overrideAccess: true })
    console.log(`✓ deleted #${id} "${p.name}" (${why})`)
  }

  const { totalDocs } = await payload.find({ collection: 'players', limit: 0, depth: 0 })
  console.log(`\nPlayers remaining: ${totalDocs}`)
  process.exit(0)
}
run().catch((e) => {
  console.error(e)
  process.exit(1)
})
