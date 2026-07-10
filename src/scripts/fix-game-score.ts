/**
 * One-off: correct the AJ & Mandy vs Bava & OM tournament game — 36-6 → 26-6.
 * Finds the bracket game by its (wrong) score and rewrites scoreA.
 * Run: cross-env NODE_OPTIONS="--no-deprecation --import=tsx/esm" tsx src/scripts/fix-game-score.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

const FROM = { scoreA: 36, scoreB: 6 }
const TO_SCORE_A = 26

const run = async () => {
  const payload = await getPayload({ config })
  const tourneys = await payload.find({ collection: 'tournaments', limit: 200, depth: 0 })

  let fixed = 0
  for (const t of tourneys.docs) {
    const bracket = t.bracket as { games?: Record<string, unknown>[] } | null
    const games = Array.isArray(bracket?.games) ? bracket!.games : []
    let changed = false
    for (const g of games) {
      if (g.scoreA === FROM.scoreA && g.scoreB === FROM.scoreB) {
        console.log(`  #${t.id} "${t.name}": game ${g.id} ${g.scoreA}-${g.scoreB} → ${TO_SCORE_A}-${g.scoreB}`)
        g.scoreA = TO_SCORE_A
        changed = true
        fixed++
      }
    }
    if (changed) {
      await payload.update({
        collection: 'tournaments',
        id: t.id,
        overrideAccess: true,
        data: { bracket: { games } },
      })
    }
  }
  console.log(fixed ? `Done — fixed ${fixed} game(s).` : 'No matching game found.')
  process.exit(0)
}

run().catch((e) => {
  console.error('fix-game-score failed:', e)
  process.exit(1)
})
