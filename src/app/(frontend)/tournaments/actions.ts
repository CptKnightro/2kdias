'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'
import { requireCommissioner } from '@/lib/auth'
import {
  readTriple,
  ttWinner,
  ttLoser,
  reigningEdition,
  emptyEdition,
  type TTSlot,
  type TTMatch,
  type TTEdition,
  type TTBracket,
} from '@/lib/triple-threat'
import type { Trophy } from '@/payload-types'

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
  if (
    bracket &&
    typeof bracket === 'object' &&
    Array.isArray((bracket as { games?: unknown }).games)
  ) {
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
    // Scores are always recorded — a walkover is just a tag on the result, and
    // the loser (by score) earns a Walk of Shame mark.
    if (scoreA == null || scoreB == null) return { ok: false, error: 'Enter both scores' }

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
    await payload.update({
      collection: 'tournaments',
      id: tournamentId,
      data: { bracket: { games } },
    })
    purge(tournamentId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/* ── Triple Threat ─────────────────────────────────────────────────────────
 * A *recurring* 3-player, 3-game gauntlet held over the tournament's `bracket`
 * JSON (no extra schema). Each edition:
 *   Game 1 (semi)  — two of the three play; winner waits in the final.
 *   Game 2 (elim)  — the semi loser plays the third (benched) player.
 *   Game 3 (final) — semi winner vs elim winner; the winner is champion.
 * Logging the final banks the edition (champion recorded) and opens a fresh
 * edition automatically, so the next Triple Threat can be logged straight away.
 * The linked `final` trophy always mirrors the reigning (latest) champion.
 * -------------------------------------------------------------------------- */

type PayloadClient = Awaited<ReturnType<typeof getPayloadClient>>

/** Revalidate everything a decided Triple Threat can touch. */
function purgeTriple(id: number | string) {
  for (const p of [`/tournaments/${id}`, '/tournaments', '/trophies', '/']) {
    try {
      revalidatePath(p)
    } catch {
      /* outside request scope — ignore */
    }
  }
}

const seasonLabel = (iso: string | null): string => {
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/** Point the linked `final` trophy at the reigning champion (or clear it). */
async function syncTripleTrophy(
  payload: PayloadClient,
  trophyId: number | null,
  reigning: TTEdition | null,
) {
  if (!trophyId) return
  const winners: NonNullable<Trophy['winners']> =
    reigning?.champion != null
      ? [
          {
            winnerType: 'team',
            franchise: reigning.champion,
            season: seasonLabel(reigning.completedAt),
            awardedAt: reigning.completedAt ?? new Date().toISOString(),
          },
        ]
      : []
  await payload.update({
    collection: 'trophies',
    id: trophyId,
    overrideAccess: true,
    data: { winners },
  })
}

/** Persist the bracket + mirror the tournament champion / trophy to the reign. */
async function saveTriple(payload: PayloadClient, tid: number, tb: TTBracket) {
  const reigning = reigningEdition(tb)
  await payload.update({
    collection: 'tournaments',
    id: tid,
    overrideAccess: true, // public game log — not tied to a signed-in user
    data: {
      bracket: { kind: tb.kind, players: tb.players, trophyId: tb.trophyId, editions: tb.editions },
      champion: reigning?.champion ?? null,
      status: 'in-progress' as const,
    },
  })
  await syncTripleTrophy(payload, tb.trophyId, reigning)
  purgeTriple(tid)
}

/**
 * Log the next Triple Threat game — open to anyone (public log, overrideAccess).
 * The engine enforces the gauntlet: the opening game takes two picked players,
 * every later game's pairing is derived from prior results. Logging the final
 * crowns the champion and opens the next edition automatically.
 */
export async function logTripleThreatMatch(input: {
  tournamentId: number | string
  /** Opening game only — the two players who tip off (the third is benched). */
  homeId?: string | number
  awayId?: string | number
  homeScore?: string | number
  awayScore?: string | number
  homeTeam?: string
  awayTeam?: string
  walkover?: boolean
}): Promise<Result & { champion?: number | null; slot?: TTSlot }> {
  try {
    const tid = Number(input.tournamentId)
    if (!Number.isFinite(tid)) return { ok: false, error: 'Unknown tournament' }

    const payload = await getPayloadClient()
    const t = await payload.findByID({ collection: 'tournaments', id: tid, depth: 0 })
    const tb = readTriple(t.bracket)
    if (!tb) return { ok: false, error: 'Not a Triple Threat tournament' }

    // The live edition is always the last one (readTriple guarantees it).
    let cur = tb.editions[tb.editions.length - 1]
    if (cur.matches.length >= 3) {
      cur = emptyEdition()
      tb.editions.push(cur)
    }

    const homeScore = int(input.homeScore)
    const awayScore = int(input.awayScore)
    if (homeScore == null || awayScore == null) return { ok: false, error: 'Enter both scores' }
    if (homeScore < 0 || awayScore < 0) return { ok: false, error: 'Scores cannot be negative' }
    if (homeScore === awayScore)
      return { ok: false, error: 'A Triple Threat game needs a winner — no ties' }

    const stage = cur.matches.length // 0 semi · 1 elim · 2 final
    let home: number
    let away: number
    if (stage === 0) {
      home = Number(input.homeId)
      away = Number(input.awayId)
      if (!tb.players.includes(home) || !tb.players.includes(away) || home === away)
        return { ok: false, error: 'Pick the two players for the opening game' }
    } else if (stage === 1) {
      const semi = cur.matches[0]
      home = ttLoser(semi)
      away = tb.players.find((p) => p !== semi.home && p !== semi.away)!
    } else {
      home = ttWinner(cur.matches[0]) // semi winner
      away = ttWinner(cur.matches[1]) // elim winner
    }

    const slot: TTSlot = stage === 0 ? 'semi' : stage === 1 ? 'elim' : 'final'
    const playedAt = new Date().toISOString()
    const match: TTMatch = {
      slot,
      home,
      away,
      homeScore,
      awayScore,
      homeTeam: input.homeTeam?.trim() || null,
      awayTeam: input.awayTeam?.trim() || null,
      walkover: !!input.walkover,
      playedAt,
    }
    cur.matches.push(match)

    let champion: number | null = null
    if (slot === 'final') {
      champion = ttWinner(match)
      cur.champion = champion
      cur.completedAt = playedAt
      tb.editions.push(emptyEdition()) // open the next edition straight away
    }

    await saveTriple(payload, tid, tb)
    return { ok: true, champion, slot }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Undo the last Triple Threat game. Commissioner-only — enforced server-side. */
export async function undoTripleThreatMatch(tournamentId: number | string): Promise<Result> {
  try {
    await requireCommissioner()
    const tid = Number(tournamentId)
    const payload = await getPayloadClient()
    const t = await payload.findByID({ collection: 'tournaments', id: tid, depth: 0 })
    const tb = readTriple(t.bracket)
    if (!tb) return { ok: false, error: 'Not a Triple Threat tournament' }

    // Find the most recent edition that actually has a game (skip the trailing
    // empty live edition opened by the last crowning).
    let i = tb.editions.length - 1
    while (i >= 0 && tb.editions[i].matches.length === 0) i--
    if (i < 0) return { ok: false, error: 'Nothing to undo' }

    // Drop any trailing empty editions, then pop the last game of edition i.
    tb.editions = tb.editions.slice(0, i + 1)
    const ed = tb.editions[i]
    ed.champion = null // if this edition was decided, it no longer is
    ed.completedAt = null
    ed.matches.pop()

    await saveTriple(payload, tid, tb)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
