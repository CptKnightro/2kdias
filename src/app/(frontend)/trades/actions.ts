'use server'

import { revalidatePath } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'
import { computeExpiresAt, type DurationUnit } from '@/lib/trades'

export type Result = { ok: boolean; error?: string; id?: number }

const MAX_PLAYERS = 3

const ids = (v: unknown): number[] =>
  Array.isArray(v) ? v.map((x) => Number(x)).filter(Number.isFinite) : []

/**
 * Propose a trade — open to anyone, no login required. Runs through Payload's
 * local API (which bypasses the `authenticated` create rule), and re-validates
 * the league rules server-side so it's safe even if called directly:
 *   - from/to must be two different franchises
 *   - at most 3 players offered and at most 3 requested
 *   - at least one player must change hands
 * Always lands as a `proposed` trade for the commissioner to settle, stamped
 * with a deadline (`expiresAt`) after which it auto-expires.
 */
export async function proposeTrade(input: {
  fromFranchise: string
  toFranchise: string
  offeredPlayers?: string[]
  requestedPlayers?: string[]
  expiresInValue?: number | string
  expiresInUnit?: DurationUnit
}): Promise<Result> {
  try {
    const fromFranchise = Number(input.fromFranchise)
    const toFranchise = Number(input.toFranchise)
    const offeredPlayers = ids(input.offeredPlayers)
    const requestedPlayers = ids(input.requestedPlayers)

    if (!Number.isFinite(fromFranchise)) return { ok: false, error: 'Pick a team to trade from' }
    if (!Number.isFinite(toFranchise)) return { ok: false, error: 'Pick a team to trade to' }
    if (fromFranchise === toFranchise) return { ok: false, error: 'Teams must be different' }
    if (offeredPlayers.length > MAX_PLAYERS)
      return { ok: false, error: `Offer at most ${MAX_PLAYERS} players` }
    if (requestedPlayers.length > MAX_PLAYERS)
      return { ok: false, error: `Request at most ${MAX_PLAYERS} players` }
    if (offeredPlayers.length === 0 && requestedPlayers.length === 0)
      return { ok: false, error: 'Add at least one player to the trade' }

    const payload = await getPayloadClient()
    const doc = await payload.create({
      collection: 'trades',
      overrideAccess: true, // public proposal — not tied to a signed-in user
      data: {
        fromFranchise,
        toFranchise,
        offeredPlayers,
        requestedPlayers,
        status: 'proposed',
        expiresAt: computeExpiresAt(input.expiresInValue, input.expiresInUnit),
      },
    })

    for (const p of ['/trades', '/']) {
      try {
        revalidatePath(p)
      } catch {
        /* outside request scope — ignore */
      }
    }
    return { ok: true, id: doc.id as number }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
