import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

/**
 * One-off: swap owner nicknames for real names — OM → Omar, Bava → Staines.
 * Updates franchises.ownerName plus any owner-type trophy winners that store
 * the name as text (team-type winners resolve through the franchise, so they
 * follow automatically). Idempotent — safe to re-run.
 *   npx tsx src/scripts/rename-owners.ts
 */
const RENAMES: Record<string, string> = {
  om: 'Omar',
  bava: 'Staines',
}

const renameOf = (v?: string | null) => RENAMES[(v ?? '').trim().toLowerCase()]

const run = async () => {
  const payload = await getPayload({ config })

  const franchises = await payload.find({ collection: 'franchises', limit: 100, depth: 0 })
  for (const f of franchises.docs) {
    const next = renameOf(f.ownerName)
    if (!next) continue
    await payload.update({ collection: 'franchises', id: f.id, data: { ownerName: next } })
    console.log(`✓ franchise ${f.name}: ${f.ownerName} → ${next}`)
  }

  const trophies = await payload.find({ collection: 'trophies', limit: 100, depth: 0 })
  for (const t of trophies.docs) {
    let touched = false
    const winners = (t.winners ?? []).map((w) => {
      const next = w.winnerType === 'owner' ? renameOf(w.ownerName) : undefined
      if (!next) return w
      touched = true
      console.log(`✓ trophy "${t.name}" winner: ${w.ownerName} → ${next}`)
      return { ...w, ownerName: next }
    })
    if (touched) await payload.update({ collection: 'trophies', id: t.id, data: { winners } })
  }

  console.log('Done.')
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
