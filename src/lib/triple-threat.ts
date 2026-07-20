/**
 * Triple Threat — a 3-player, 3-game gauntlet stored entirely in a
 * tournament's `bracket` JSON (no extra schema). Shared between the server
 * action (which mutates it) and the tournament page (which renders it).
 *
 *   Game 1 (semi)  — two of the three play; the winner waits in the final.
 *   Game 2 (elim)  — the semi loser plays the third (benched) player.
 *   Game 3 (final) — semi winner vs elim winner; the winner is champion.
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

export type TTBracket = {
  kind: typeof TRIPLE_THREAT_KIND
  /** The three franchise ids in this Triple Threat. */
  players: number[]
  /** The `final` trophy this event crowns (one reigning holder). */
  trophyId: number | null
  /** Games played so far, in order (semi → elim → final). */
  matches: TTMatch[]
  champion: number | null
  completedAt: string | null
}

/** Is this tournament a Triple Threat? (Cheap check on the raw bracket.) */
export function isTripleThreat(bracket: unknown): boolean {
  return (
    !!bracket &&
    typeof bracket === 'object' &&
    (bracket as { kind?: unknown }).kind === TRIPLE_THREAT_KIND
  )
}

/** Parse a tournament's bracket as a Triple Threat, or null if it isn't one. */
export function readTriple(bracket: unknown): TTBracket | null {
  if (!isTripleThreat(bracket)) return null
  const b = bracket as Record<string, unknown>
  const num = (v: unknown): number | null =>
    v != null && Number.isFinite(Number(v)) ? Number(v) : null
  const players = Array.isArray(b.players) ? b.players.map(Number).filter(Number.isFinite) : []
  const matches: TTMatch[] = Array.isArray(b.matches)
    ? (b.matches as Record<string, unknown>[]).map((m) => ({
        slot: (m.slot === 'elim' || m.slot === 'final' ? m.slot : 'semi') as TTSlot,
        home: Number(m.home),
        away: Number(m.away),
        homeScore: num(m.homeScore),
        awayScore: num(m.awayScore),
        homeTeam: typeof m.homeTeam === 'string' ? m.homeTeam : null,
        awayTeam: typeof m.awayTeam === 'string' ? m.awayTeam : null,
        walkover: !!m.walkover,
        playedAt: typeof m.playedAt === 'string' ? m.playedAt : null,
      }))
    : []
  return {
    kind: TRIPLE_THREAT_KIND,
    players,
    trophyId: num(b.trophyId),
    matches,
    champion: num(b.champion),
    completedAt: typeof b.completedAt === 'string' ? b.completedAt : null,
  }
}

/** Winning / losing franchise id of a decided game (by score). */
export const ttWinner = (m: TTMatch): number =>
  (m.homeScore ?? 0) > (m.awayScore ?? 0) ? m.home : m.away
export const ttLoser = (m: TTMatch): number => (ttWinner(m) === m.home ? m.away : m.home)
