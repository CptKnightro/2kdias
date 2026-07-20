/**
 * One-off (idempotent): create the three Triple Threat tournaments + their
 * trophies. A Triple Threat is a 3-player, 3-game gauntlet held entirely in the
 * tournament's `bracket` JSON (no schema change):
 *   opener winner waits in the final · loser plays the benched third player ·
 *   the two winners meet for the ring.
 *
 * Trophies are `final` rings (one reigning holder) so they never pollute the
 * home G.O.A.T / 2K ring counts. Re-running is safe: existing tournaments keep
 * any games already logged.
 *
 * Run: NODE_OPTIONS="--no-deprecation --import=tsx/esm" npx tsx src/scripts/create-triple-threats.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { TRIPLE_THREAT_KIND } from '../lib/triple-threat'

// Suffix letters → owner display name.
const LETTER: Record<string, string> = { A: 'AJ', M: 'Mandy', S: 'Staines', O: 'Omar' }

// The three line-ups (AJ features in every one; the AJ-less trio is left out).
const COMBOS = ['AMO', 'MAS', 'OAS']

const run = async () => {
  const payload = await getPayload({ config })

  // owner display name (lower) → franchise id
  const fr = await payload.find({ collection: 'franchises', limit: 200, depth: 0 })
  const idByOwner = new Map<string, number>()
  for (const f of fr.docs) {
    const owner = ((f as { ownerName?: string }).ownerName ?? '').trim().toLowerCase()
    if (owner) idByOwner.set(owner, f.id as number)
  }

  const existingTr = await payload.find({ collection: 'trophies', limit: 200, depth: 0 })
  const existingTo = await payload.find({ collection: 'tournaments', limit: 200, depth: 0 })
  const trophyByName = new Map(existingTr.docs.map((t) => [t.name.trim().toLowerCase(), t]))
  const tourneyByName = new Map(existingTo.docs.map((t) => [t.name.trim().toLowerCase(), t]))

  for (const suffix of COMBOS) {
    const owners = suffix.split('').map((l) => LETTER[l])
    const players = owners.map((o) => idByOwner.get(o.toLowerCase()))
    if (players.some((p) => p == null)) {
      console.error(`✗ ${suffix}: missing franchise for ${owners.join('/')} — skipped`)
      continue
    }
    const playerIds = players as number[]
    const name = `Triple Threat ${suffix}`
    const key = name.toLowerCase()
    const lineup = owners.join(' · ')

    /* ── trophy (final ring) ─────────────────────────────────────── */
    let trophy = trophyByName.get(key)
    if (!trophy) {
      trophy = await payload.create({
        collection: 'trophies',
        overrideAccess: true,
        data: {
          name,
          kind: 'final',
          icon: 'ring',
          ring: 'goat',
          description: `Reigning champion of the ${lineup} Triple Threat — win all the way through to claim the ring.`,
          winners: [],
        },
      })
      console.log(`✓ trophy #${trophy.id}  "${name}"`)
    } else {
      console.log(`• trophy "${name}" already exists (#${trophy.id})`)
    }

    /* ── tournament (triple-threat bracket) ──────────────────────── */
    const existing = tourneyByName.get(key)
    const freshBracket = {
      kind: TRIPLE_THREAT_KIND,
      players: playerIds,
      trophyId: trophy.id as number,
      matches: [],
      champion: null,
      completedAt: null,
    }

    if (!existing) {
      const to = await payload.create({
        collection: 'tournaments',
        overrideAccess: true,
        data: {
          name,
          format: 'single-elim',
          status: 'in-progress',
          season: 'Triple Threat',
          participants: playerIds,
          description: `${lineup}. Three players, three games: the opening winner waits in the final while the loser plays the benched third — the two winners meet for the ring.`,
          bracket: freshBracket,
        },
      })
      console.log(`✓ tournament #${to.id}  "${name}"  players=[${playerIds.join(',')}]  trophy=#${trophy.id}`)
    } else {
      // Preserve any games already logged; only ensure the link fields are set.
      const cur = (existing.bracket ?? {}) as Record<string, unknown>
      const isTriple = cur.kind === TRIPLE_THREAT_KIND
      const bracket = isTriple
        ? { ...cur, players: playerIds, trophyId: trophy.id as number }
        : freshBracket
      await payload.update({
        collection: 'tournaments',
        id: existing.id,
        overrideAccess: true,
        data: { participants: playerIds, bracket },
      })
      console.log(`• tournament "${name}" already exists (#${existing.id}) — link fields ensured`)
    }
  }

  console.log('\nDone.')
  process.exit(0)
}

run().catch((e) => {
  console.error('create-triple-threats failed:', e)
  process.exit(1)
})
