import { ownerLabel, PRIMARY, type FranchiseRow, type TeamStat } from '@/lib/home-stats'

/**
 * Tournament + Walk-of-Shame aggregation. Tournament games live in each
 * tournament's `bracket` JSON and can be 1v1 or 2v2, so a "side" is a list of
 * franchise ids (one for 1v1, two for 2v2). League matches (the `matches`
 * collection) normalise to the same shape with one id per side. Every builder
 * credits each franchise on a side, so 2v2 co-op counts for both partners.
 */

/** A game with franchise ids per side — unifies league (1/side) + tournament (1–2/side). */
export type SideGame = {
  a: number[]
  b: number[]
  scoreA: number | null
  scoreB: number | null
  walkover: boolean
}

const relId = (v: unknown): number | null => {
  if (v == null) return null
  if (typeof v === 'object') {
    const id = (v as { id?: unknown }).id
    return typeof id === 'number' ? id : null
  }
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Winner side by score, or null on a tie / missing score (no decisive result). */
function winnerOf(g: SideGame): 'a' | 'b' | null {
  if (g.scoreA == null || g.scoreB == null) return null
  if (g.scoreA > g.scoreB) return 'a'
  if (g.scoreB > g.scoreA) return 'b'
  return null
}

/** Normalise a tournament's `bracket.games` JSON into SideGames. */
export function bracketToSideGames(bracket: unknown): SideGame[] {
  const arr =
    bracket && typeof bracket === 'object' && Array.isArray((bracket as { games?: unknown }).games)
      ? ((bracket as { games: unknown[] }).games as Record<string, unknown>[])
      : []
  const ids = (v: unknown): number[] =>
    Array.isArray(v) ? v.map(Number).filter(Number.isFinite) : []
  return arr.map((g) => {
    const a = (g.a ?? {}) as { owners?: unknown }
    const b = (g.b ?? {}) as { owners?: unknown }
    return {
      a: ids(a.owners),
      b: ids(b.owners),
      scoreA: typeof g.scoreA === 'number' ? g.scoreA : null,
      scoreB: typeof g.scoreB === 'number' ? g.scoreB : null,
      walkover: !!g.walkover,
    }
  })
}

/** Normalise a league match row into a SideGame (one franchise per side). */
export function matchToSideGame(m: {
  homeFranchise: unknown
  awayFranchise: unknown
  homeScore?: number | null
  awayScore?: number | null
  walkover?: boolean | null
}): SideGame | null {
  const h = relId(m.homeFranchise)
  const a = relId(m.awayFranchise)
  if (h == null || a == null) return null
  return {
    a: [h],
    b: [a],
    scoreA: m.homeScore ?? null,
    scoreB: m.awayScore ?? null,
    walkover: !!m.walkover,
  }
}

/** Per-franchise W/L/points from a set of games (compatible with StandingsTable + buildWinShare). */
export function buildTournamentStats(franchises: FranchiseRow[], games: SideGame[]): TeamStat[] {
  const map = new Map<number, TeamStat>()
  for (const f of franchises) {
    map.set(f.id, {
      id: f.id,
      name: f.name,
      owner: f.owner,
      color: f.color,
      games: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    })
  }
  for (const g of games) {
    const w = winnerOf(g)
    const sa = g.scoreA ?? 0
    const sb = g.scoreB ?? 0
    for (const id of g.a) {
      const t = map.get(id)
      if (!t) continue
      t.games++
      t.pointsFor += sa
      t.pointsAgainst += sb
      if (w === 'a') t.wins++
      else if (w === 'b') t.losses++
    }
    for (const id of g.b) {
      const t = map.get(id)
      if (!t) continue
      t.games++
      t.pointsFor += sb
      t.pointsAgainst += sa
      if (w === 'b') t.wins++
      else if (w === 'a') t.losses++
    }
  }
  return [...map.values()].filter((t) => t.games > 0)
}

export type ShameRow = { id: number; owner: string; team: string; color: string; defeats: number }

/**
 * Walk of Shame — a franchise earns a "walkover defeat" for every walkover-
 * flagged game it *lost* (by score). Pass the combined league + tournament
 * games; the franchise(s) with the most defeats wear the crown of shame.
 */
export function buildWalkOfShame(franchises: FranchiseRow[], games: SideGame[]): ShameRow[] {
  const map = new Map<number, ShameRow>()
  for (const f of franchises) {
    map.set(f.id, { id: f.id, owner: ownerLabel(f), team: f.name, color: f.color ?? PRIMARY, defeats: 0 })
  }
  for (const g of games) {
    if (!g.walkover) continue
    const w = winnerOf(g)
    if (!w) continue // a tie / missing score has no loser to shame
    const losers = w === 'a' ? g.b : g.a
    for (const id of losers) {
      const r = map.get(id)
      if (r) r.defeats++
    }
  }
  return [...map.values()].filter((r) => r.defeats > 0).sort((a, b) => b.defeats - a.defeats)
}

export type TitleRow = { id: number; owner: string; team: string; color: string; titles: number }

/** Titles won — one per completed tournament that named a champion. */
export function buildTitles(franchises: FranchiseRow[], championIds: number[]): TitleRow[] {
  const map = new Map<number, TitleRow>()
  for (const f of franchises) {
    map.set(f.id, { id: f.id, owner: ownerLabel(f), team: f.name, color: f.color ?? PRIMARY, titles: 0 })
  }
  for (const id of championIds) {
    const r = map.get(id)
    if (r) r.titles++
  }
  return [...map.values()].filter((r) => r.titles > 0).sort((a, b) => b.titles - a.titles)
}

/* ────────────────────────────────────────────────────────────────────────────
 * Single-tournament analytics — the OG format: 4 players rotate partners in
 * 2v2, and every pairing plays a best-of-5 series before the next duo is up.
 * Because partners rotate, the meaningful unit is the *individual* (a franchise
 * ≈ one owner) and the *series*, not a fixed franchise.
 * ──────────────────────────────────────────────────────────────────────────── */

const sideKey = (ids: number[]): string => [...ids].sort((x, y) => x - y).join('-')

/** True when any game is 2v2 — i.e. a rotating-doubles tournament like OG. */
export function isDoublesTournament(games: SideGame[]): boolean {
  return games.some((g) => g.a.length > 1 || g.b.length > 1)
}

/** One game inside a series, oriented to the series' fixed A / B pairing. */
export type SeriesGame = {
  scoreA: number
  scoreB: number
  winner: 'a' | 'b' | null
  walkover: boolean
}

/** A best-of-N series between two fixed pairings (or players, in a 1v1). */
export type Series = {
  index: number
  aIds: number[]
  bIds: number[]
  aOwners: string
  bOwners: string
  aColor: string
  bColor: string
  aTeam: string
  bTeam: string
  winsA: number
  winsB: number
  winner: 'a' | 'b' | null
  bestOf: number
  live: boolean
  games: SeriesGame[]
  /** Index of each series game back into the input array (for edit/delete UIs). */
  gameIndices: number[]
}

/**
 * Group a tournament's games (in play order) into best-of-N series. A series is
 * a run of games between the same matchup (unordered pair of unordered sides);
 * it closes the moment one side reaches the win threshold, so the *next* game —
 * even a rematch of the same duos — starts a fresh series. This is what splits
 * OG's six games into "Series 1 (won 3–2)" + "Series 2 (live, 1–0)".
 */
export function buildSeries(
  franchises: FranchiseRow[],
  games: SideGame[],
  bestOf = 5,
): Series[] {
  const need = Math.floor(bestOf / 2) + 1
  const label = new Map(franchises.map((f) => [f.id, ownerLabel(f)]))
  const color = new Map(franchises.map((f) => [f.id, f.color ?? PRIMARY]))
  const owners = (ids: number[]) => ids.map((id) => label.get(id) ?? '—').join(' & ')

  const out: Series[] = []
  let cur: Series | null = null
  let curKey = ''

  for (let i = 0; i < games.length; i++) {
    const g = games[i]
    if (!g.a.length || !g.b.length) continue
    const kA = sideKey(g.a)
    const kB = sideKey(g.b)
    const matchKey = [kA, kB].sort().join('|')

    if (!cur || cur.winner !== null || curKey !== matchKey) {
      // Fix the series' A/B orientation to the smaller sideKey so flipped games
      // (side A one night, side B the next) still land on the same column.
      const aIsFirst = [kA, kB].sort()[0] === kA
      const aIds = aIsFirst ? g.a : g.b
      const bIds = aIsFirst ? g.b : g.a
      cur = {
        index: out.length + 1,
        aIds,
        bIds,
        aOwners: owners(aIds),
        bOwners: owners(bIds),
        aColor: color.get(aIds[0]) ?? PRIMARY,
        bColor: color.get(bIds[0]) ?? PRIMARY,
        aTeam: label.get(aIds[0]) ?? '',
        bTeam: label.get(bIds[0]) ?? '',
        winsA: 0,
        winsB: 0,
        winner: null,
        bestOf,
        live: true,
        games: [],
        gameIndices: [],
      }
      out.push(cur)
      curKey = matchKey
    }

    const aIsSeriesA = sideKey(cur.aIds) === kA
    const sA = (aIsSeriesA ? g.scoreA : g.scoreB) ?? 0
    const sB = (aIsSeriesA ? g.scoreB : g.scoreA) ?? 0
    const w: 'a' | 'b' | null = sA > sB ? 'a' : sB > sA ? 'b' : null
    if (w === 'a') cur.winsA++
    else if (w === 'b') cur.winsB++
    cur.games.push({ scoreA: sA, scoreB: sB, winner: w, walkover: g.walkover })
    cur.gameIndices.push(i)
    if (cur.winsA >= need) {
      cur.winner = 'a'
      cur.live = false
    } else if (cur.winsB >= need) {
      cur.winner = 'b'
      cur.live = false
    }
  }
  return out
}

/** Per-duo record across a doubles tournament (both partners share the result). */
export type PairStat = {
  key: string
  ids: number[]
  owners: string
  color: string
  games: number
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
}

/** Aggregate every 2-player pairing that took a side, ordered by wins. */
export function buildPairings(franchises: FranchiseRow[], games: SideGame[]): PairStat[] {
  const label = new Map(franchises.map((f) => [f.id, ownerLabel(f)]))
  const color = new Map(franchises.map((f) => [f.id, f.color ?? PRIMARY]))
  const map = new Map<string, PairStat>()
  const touch = (ids: number[]): PairStat => {
    const sorted = [...ids].sort((a, b) => a - b)
    const key = sorted.join('-')
    let p = map.get(key)
    if (!p) {
      p = {
        key,
        ids: sorted,
        owners: sorted.map((id) => label.get(id) ?? '—').join(' & '),
        color: color.get(sorted[0]) ?? PRIMARY,
        games: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      }
      map.set(key, p)
    }
    return p
  }

  for (const g of games) {
    if (g.a.length < 2 || g.b.length < 2) continue // pairings only
    const sa = g.scoreA ?? 0
    const sb = g.scoreB ?? 0
    const w = winnerOf(g)
    const pa = touch(g.a)
    const pb = touch(g.b)
    pa.games++
    pb.games++
    pa.pointsFor += sa
    pa.pointsAgainst += sb
    pb.pointsFor += sb
    pb.pointsAgainst += sa
    if (w === 'a') {
      pa.wins++
      pb.losses++
    } else if (w === 'b') {
      pb.wins++
      pa.losses++
    }
  }
  return [...map.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses)
}
