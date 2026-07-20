'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'
import { requireCommissioner } from '@/lib/auth'
import {
  readTriple,
  ttWinner,
  ttLoser,
  type TTSlot,
  type TTMatch,
} from '@/lib/triple-threat'

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
 * A 3-player, 3-game gauntlet held over the tournament's `bracket` JSON (no
 * extra schema). The whole state is a `kind: 'triple-threat'` bracket:
 *   Game 1 (semi)  — two of the three play; winner waits in the final.
 *   Game 2 (elim)  — the semi loser plays the third (benched) player.
 *   Game 3 (final) — semi winner vs elim winner; the winner is champion.
 * When the final is logged the champion is stamped on the tournament and the
 * linked trophy (a `final` ring — one reigning holder).
 * -------------------------------------------------------------------------- */

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

/**
 * Log the next Triple Threat game — open to anyone (public log, overrideAccess).
 * The engine enforces the gauntlet: the opening game takes two picked players,
 * every later game's pairing is derived from prior results. Logging the final
 * crowns the champion and awards the linked ring.
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
    if (tb.matches.length >= 3)
      return { ok: false, error: 'This Triple Threat is already decided — undo the final to replay.' }

    const homeScore = int(input.homeScore)
    const awayScore = int(input.awayScore)
    if (homeScore == null || awayScore == null) return { ok: false, error: 'Enter both scores' }
    if (homeScore < 0 || awayScore < 0) return { ok: false, error: 'Scores cannot be negative' }
    if (homeScore === awayScore)
      return { ok: false, error: 'A Triple Threat game needs a winner — no ties' }

    const stage = tb.matches.length // 0 semi · 1 elim · 2 final
    let home: number
    let away: number
    if (stage === 0) {
      home = Number(input.homeId)
      away = Number(input.awayId)
      if (!tb.players.includes(home) || !tb.players.includes(away) || home === away)
        return { ok: false, error: 'Pick the two players for the opening game' }
    } else if (stage === 1) {
      const semi = tb.matches[0]
      home = ttLoser(semi)
      away = tb.players.find((p) => p !== semi.home && p !== semi.away)!
    } else {
      home = ttWinner(tb.matches[0]) // semi winner
      away = ttWinner(tb.matches[1]) // elim winner
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
    const matches = [...tb.matches, match]

    const champion = slot === 'final' ? ttWinner(match) : tb.champion
    const completedAt = slot === 'final' ? playedAt : tb.completedAt

    await payload.update({
      collection: 'tournaments',
      id: tid,
      overrideAccess: true, // public game log — not tied to a signed-in user
      data: {
        bracket: { ...tb, matches, champion, completedAt },
        ...(slot === 'final'
          ? { champion, status: 'completed' as const }
          : { status: 'in-progress' as const }),
      },
    })

    // Crown the ring — a `final` trophy keeps only the latest holder (the
    // reigning champion), so we just append and let the collection hook trim.
    if (slot === 'final' && tb.trophyId && champion) {
      const tr = await payload.findByID({ collection: 'trophies', id: tb.trophyId, depth: 0 })
      const winners = Array.isArray(tr.winners) ? tr.winners : []
      winners.push({
        winnerType: 'team',
        franchise: champion,
        season: seasonLabel(playedAt),
        awardedAt: playedAt,
      } as (typeof winners)[number])
      await payload.update({
        collection: 'trophies',
        id: tb.trophyId,
        overrideAccess: true,
        data: { winners },
      })
    }

    purgeTriple(tid)
    return { ok: true, champion: champion ?? null, slot }
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
    if (tb.matches.length === 0) return { ok: false, error: 'Nothing to undo' }

    const removed = tb.matches[tb.matches.length - 1]
    const matches = tb.matches.slice(0, -1)
    const undoneFinal = removed.slot === 'final'
    const champion = undoneFinal ? null : tb.champion
    const completedAt = undoneFinal ? null : tb.completedAt

    await payload.update({
      collection: 'tournaments',
      id: tid,
      data: {
        bracket: { ...tb, matches, champion, completedAt },
        champion,
        status: 'in-progress' as const,
      },
    })

    // Undoing the final strips the ring we just awarded (drop the latest holder).
    if (undoneFinal && tb.trophyId) {
      const tr = await payload.findByID({ collection: 'trophies', id: tb.trophyId, depth: 0 })
      const winners = Array.isArray(tr.winners) ? tr.winners.slice(0, -1) : []
      await payload.update({
        collection: 'trophies',
        id: tb.trophyId,
        overrideAccess: true,
        data: { winners },
      })
    }

    purgeTriple(tid)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
