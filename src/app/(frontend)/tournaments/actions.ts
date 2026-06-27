'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'
import { requireCommissioner } from '@/lib/auth'

export type Result = { ok: boolean; error?: string }

/** One side of a tournament game: 1 owner (1v1) or 2 owners (2v2) + the team they play. */
export type GameSide = { owners: number[]; team: string | null }

export type TournamentGame = {
  id: string
  format: '1v1' | '2v2'
  a: GameSide
  b: GameSide
  scoreA: number | null
  scoreB: number | null
  walkover: boolean
}

/** Games live in the tournament's `bracket` JSON column (no extra schema). */
function readGames(bracket: unknown): TournamentGame[] {
  if (bracket && typeof bracket === 'object' && Array.isArray((bracket as { games?: unknown }).games)) {
    return (bracket as { games: TournamentGame[] }).games
  }
  return []
}

const int = (v: unknown): number | null => {
  if (v === '' || v == null) return null
  const x = Math.round(Number(v))
  return Number.isFinite(x) ? x : null
}

const owners = (v: unknown): number[] =>
  Array.isArray(v) ? v.map((x) => Number(x)).filter(Number.isFinite) : []

function purge(id: number | string) {
  for (const p of [`/tournaments/${id}`, '/tournaments']) {
    try {
      revalidatePath(p)
    } catch {
      /* outside request scope — ignore */
    }
  }
}

/**
 * Log a game inside a tournament — open to anyone, no login required. Supports
 * 1v1 (one owner a side) and 2v2 co-op (two owners a side, sharing one team).
 * Re-validated server-side and written via the local API (overrideAccess), so
 * it's safe even though tournament writes are normally commissioner-only.
 */
export async function logTournamentGame(input: {
  tournamentId: number | string
  format: '1v1' | '2v2'
  aOwners: string[]
  bOwners: string[]
  aTeam?: string
  bTeam?: string
  scoreA?: string | number
  scoreB?: string | number
  walkover?: boolean
}): Promise<Result> {
  try {
    const tid = Number(input.tournamentId)
    if (!Number.isFinite(tid)) return { ok: false, error: 'Unknown tournament' }

    const format = input.format === '2v2' ? '2v2' : '1v1'
    const need = format === '2v2' ? 2 : 1
    const aOwners = owners(input.aOwners)
    const bOwners = owners(input.bOwners)
    if (aOwners.length !== need || bOwners.length !== need)
      return { ok: false, error: `Pick ${need} ${need > 1 ? 'owners' : 'owner'} per side` }
    if (aOwners.some((o) => bOwners.includes(o)))
      return { ok: false, error: 'An owner can’t play on both sides' }

    const walkover = !!input.walkover
    const scoreA = int(input.scoreA)
    const scoreB = int(input.scoreB)
    if (!walkover && (scoreA == null || scoreB == null))
      return { ok: false, error: 'Enter both scores' }

    const payload = await getPayloadClient()
    const t = await payload.findByID({ collection: 'tournaments', id: tid, depth: 0 })
    const games = readGames(t.bracket)
    games.push({
      id: randomUUID(),
      format,
      a: { owners: aOwners, team: input.aTeam?.trim() || null },
      b: { owners: bOwners, team: input.bTeam?.trim() || null },
      scoreA,
      scoreB,
      walkover,
    })

    await payload.update({
      collection: 'tournaments',
      id: tid,
      overrideAccess: true, // public game log — not tied to a signed-in user
      data: { bracket: { games } },
    })
    purge(tid)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Delete a logged game. Commissioner-only — enforced server-side. */
export async function deleteTournamentGame(tournamentId: number, gameId: string): Promise<Result> {
  try {
    await requireCommissioner()
    const payload = await getPayloadClient()
    const t = await payload.findByID({ collection: 'tournaments', id: tournamentId, depth: 0 })
    const games = readGames(t.bracket).filter((g) => g.id !== gameId)
    await payload.update({ collection: 'tournaments', id: tournamentId, data: { bracket: { games } } })
    purge(tournamentId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
