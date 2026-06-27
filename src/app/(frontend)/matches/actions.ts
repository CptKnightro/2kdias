'use server'

import { revalidatePath } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'
import type { Match } from '@/payload-types'

export type Result = { ok: boolean; error?: string; id?: number }

const int = (v: unknown): number | null => {
  if (v === '' || v == null) return null
  const x = Math.round(Number(v))
  return Number.isFinite(x) ? x : null
}

/**
 * Log a finished match — open to anyone, no login required. Runs through
 * Payload's local API (which bypasses the `authenticated` create rule), and
 * re-validates server-side so it's safe even if called directly:
 *   - two different franchises
 *   - both scores present and non-negative
 * Records a `final` match stamped with the current time; the dashboard charts
 * read straight off these rows.
 */
export async function logMatch(input: {
  homeFranchise: string
  awayFranchise: string
  homeScore: string | number
  awayScore: string | number
}): Promise<Result> {
  try {
    const homeFranchise = Number(input.homeFranchise)
    const awayFranchise = Number(input.awayFranchise)
    const homeScore = int(input.homeScore)
    const awayScore = int(input.awayScore)

    if (!Number.isFinite(homeFranchise)) return { ok: false, error: 'Pick the first team' }
    if (!Number.isFinite(awayFranchise)) return { ok: false, error: 'Pick the second team' }
    if (homeFranchise === awayFranchise) return { ok: false, error: 'Teams must be different' }
    if (homeScore == null || awayScore == null) return { ok: false, error: 'Enter both scores' }
    if (homeScore < 0 || awayScore < 0) return { ok: false, error: 'Scores cannot be negative' }

    const payload = await getPayloadClient()
    const doc = await payload.create({
      collection: 'matches',
      overrideAccess: true, // public match log — not tied to a signed-in user
      data: {
        homeFranchise,
        awayFranchise,
        homeScore,
        awayScore,
        status: 'final' as Match['status'],
        playedAt: new Date().toISOString(),
      },
    })

    for (const p of ['/', '/matches', '/standings']) {
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
