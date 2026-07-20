/**
 * Triple Threat — a *recurring* 3-player, 3-game gauntlet stored entirely in a
 * tournament's `bracket` JSON (no extra schema). Shared between the server
 * action (which mutates it) and the tournament page (which renders it).
 *
 * One edition = three games:
 *   Game 1 (semi)  — two of the three play; the winner waits in the final.
 *   Game 2 (elim)  — the semi loser plays the third (benched) player.
 *   Game 3 (final) — semi winner vs elim winner; the winner is champion.
 *
 * When the final is logged the edition is banked (champion recorded) and a
 * fresh empty edition opens so the next Triple Threat can be logged straight
 * away. The `editions` list keeps the full champion history; the last edition
 * is always the live/in-progress one.
 */

export const TRIPLE_THREAT_KIND = 'triple-threat' as const

export type TTSlot = 'semi' | 'elim' | 'final'

export type TTMatch = {
  slot: TTSlot
  home: number
  away: number
  homeScore: number | null
  awayScore: number | null
  homeTeam: string | null
  awayTeam: string | null
  walkover: boolean
  playedAt: string | null
}

export type TTEdition = {
  matches: TTMatch[]
  champion: number | null
  completedAt: string | null
}

export type TTBracket = {
  kind: typeof TRIPLE_THREAT_KIND
  /** The three franchise ids in this Triple Threat. */
  players: number[]
  /** The `final` trophy this event crowns (mirrors the reigning champion). */
  trophyId: number | null
  /** Editions in chronological order — the LAST one is always the live one. */
  editions: TTEdition[]
}

const num = (v: unknown): number | null =>
  v != null && Number.isFinite(Number(v)) ? Number(v) : null

export const emptyEdition = (): TTEdition => ({ matches: [], champion: null, completedAt: null })

/** A fresh, empty Triple Threat bracket for a new tournament. */
export const emptyTripleBracket = (players: number[], trophyId: number | null): TTBracket => ({
  kind: TRIPLE_THREAT_KIND,
  players,
  trophyId,
  editions: [emptyEdition()],
})

/** Is this tournament a Triple Threat? (Cheap check on the raw bracket.) */
export function isTripleThreat(bracket: unknown): boolean {
  return (
    !!bracket &&
    typeof bracket === 'object' &&
    (bracket as { kind?: unknown }).kind === TRIPLE_THREAT_KIND
  )
}

function readMatch(m: Record<string, unknown>): TTMatch {
  return {
    slot: (m.slot === 'elim' || m.slot === 'final' ? m.slot : 'semi') as TTSlot,
    home: Number(m.home),
    away: Number(m.away),
    homeScore: num(m.homeScore),
    awayScore: num(m.awayScore),
    homeTeam: typeof m.homeTeam === 'string' ? m.homeTeam : null,
    awayTeam: typeof m.awayTeam === 'string' ? m.awayTeam : null,
    walkover: !!m.walkover,
    playedAt: typeof m.playedAt === 'string' ? m.playedAt : null,
  }
}

/**
 * Parse a tournament's bracket as a Triple Threat, or null if it isn't one.
 * Normalises the legacy single-edition shape (`bracket.matches`) into
 * `editions`, and guarantees the last edition is always the live one (an empty
 * edition is appended if the most recent edition is already decided).
 */
export function readTriple(bracket: unknown): TTBracket | null {
  if (!isTripleThreat(bracket)) return null
  const b = bracket as Record<string, unknown>
  const players = Array.isArray(b.players) ? b.players.map(Number).filter(Number.isFinite) : []
  const trophyId = num(b.trophyId)

  let editions: TTEdition[] = []
  if (Array.isArray(b.editions)) {
    editions = (b.editions as Record<string, unknown>[]).map((e) => ({
      matches: Array.isArray(e.matches) ? (e.matches as Record<string, unknown>[]).map(readMatch) : [],
      champion: num(e.champion),
      completedAt: typeof e.completedAt === 'string' ? e.completedAt : null,
    }))
  } else if (Array.isArray(b.matches)) {
    // Legacy single-edition shape.
    editions = [
      {
        matches: (b.matches as Record<string, unknown>[]).map(readMatch),
        champion: num(b.champion),
        completedAt: typeof b.completedAt === 'string' ? b.completedAt : null,
      },
    ]
  }

  if (editions.length === 0) editions = [emptyEdition()]
  // Invariant: the last edition is the live one (never already decided).
  const last = editions[editions.length - 1]
  if (last.champion != null) editions.push(emptyEdition())

  return { kind: TRIPLE_THREAT_KIND, players, trophyId, editions }
}

/** Winning / losing franchise id of a decided game (by score). */
export const ttWinner = (m: TTMatch): number =>
  (m.homeScore ?? 0) > (m.awayScore ?? 0) ? m.home : m.away
export const ttLoser = (m: TTMatch): number => (ttWinner(m) === m.home ? m.away : m.home)

/** The live (in-progress) edition — always the last one. */
export const liveEdition = (tb: TTBracket): TTEdition => tb.editions[tb.editions.length - 1]

/** Decided editions in chronological order (edition 1, 2, 3 …). */
export const completedEditions = (tb: TTBracket): TTEdition[] =>
  tb.editions.filter((e) => e.champion != null)

/** The most recently decided edition (the reigning champion), or null. */
export function reigningEdition(tb: TTBracket): TTEdition | null {
  const done = completedEditions(tb)
  return done.length ? done[done.length - 1] : null
}
