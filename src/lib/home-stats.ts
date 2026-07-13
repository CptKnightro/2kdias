/**
 * Home-dashboard aggregation layer.
 *
 * Pure functions that roll the league's logged matches into the shapes the
 * dashboard infographics consume. Everything here is derived from the matches
 * the home page already loads — no extra queries. Owner names are first-class:
 * the league is identified by owners, not team names.
 */

export const PRIMARY = '#DF2604'

/** Brand chart palette (mirrors --chart-1..5 in globals.css). */
export const CHART_COLORS = ['#df2604', '#f59e0b', '#2563eb', '#16a34a', '#9333ea'] as const

export type TeamStat = {
  id: number
  name: string
  owner: string | null
  color: string | null
  games: number
  wins: number
  losses: number
  draws: number
  pointsFor: number
  pointsAgainst: number
}

export type FranchiseRow = {
  id: number
  name: string
  owner: string | null
  color: string | null
}

export type RawMatch = {
  homeFranchise: unknown
  awayFranchise: unknown
  homeScore?: number | null
  awayScore?: number | null
  playedAt?: string | null
  walkover?: boolean | null
}

/** A match resolved to ids + scores, in the order it was played. */
type PlayedMatch = {
  homeId: number
  awayId: number
  homeScore: number
  awayScore: number
  walkover: boolean
  playedAt: string | null
}

const relId = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id?: number }).id ?? null) : Number(v)

/** Display label for a franchise — owner name wins, team name is the fallback. */
export const ownerLabel = (t: { owner: string | null; name: string }): string => t.owner ?? t.name

/**
 * A distinct, stable color per series. Uses the team's own color when it's set
 * to something other than the default brand red (which most share), otherwise
 * falls back to a palette slot so charts stay readable.
 */
export const seriesColor = (color: string | null, index: number): string =>
  color && color.toLowerCase() !== PRIMARY.toLowerCase()
    ? color
    : CHART_COLORS[index % CHART_COLORS.length]

/** Resolve raw matches to clean, chronologically-ordered played matches. */
function resolve(matches: RawMatch[]): PlayedMatch[] {
  const out: PlayedMatch[] = []
  for (const m of matches) {
    const homeId = relId(m.homeFranchise)
    const awayId = relId(m.awayFranchise)
    if (homeId == null || awayId == null) continue
    if (m.homeScore == null || m.awayScore == null) continue
    out.push({
      homeId,
      awayId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      walkover: !!m.walkover,
      playedAt: m.playedAt ?? null,
    })
  }
  // Oldest → newest. Missing dates sort to the start, preserving insertion order.
  return out.sort((a, b) => {
    const ta = a.playedAt ? Date.parse(a.playedAt) : 0
    const tb = b.playedAt ? Date.parse(b.playedAt) : 0
    return ta - tb
  })
}

const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

// ── Standings roll-up ───────────────────────────────────────────────────────

/** Per-team win/loss + points totals across every logged match. */
export function buildStats(franchises: FranchiseRow[], matches: RawMatch[]): TeamStat[] {
  const map = new Map<number, TeamStat>()
  // Resolve a stable, distinct color per franchise here so every chart that reads
  // TeamStat.color (bars, donut, standings dot) matches the matrix/form/timeline,
  // which derive the same color from the same name-ordered franchise index.
  franchises.forEach((f, i) => {
    map.set(f.id, {
      id: f.id,
      name: f.name,
      owner: f.owner,
      color: seriesColor(f.color, i),
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    })
  })
  for (const m of resolve(matches)) {
    const home = map.get(m.homeId)
    const away = map.get(m.awayId)
    if (!home || !away) continue
    home.games++
    away.games++
    home.pointsFor += m.homeScore
    home.pointsAgainst += m.awayScore
    away.pointsFor += m.awayScore
    away.pointsAgainst += m.homeScore
    if (m.homeScore > m.awayScore) {
      home.wins++
      away.losses++
    } else if (m.awayScore > m.homeScore) {
      away.wins++
      home.losses++
    } else {
      home.draws++
      away.draws++
    }
  }
  return [...map.values()]
}

/** Standings order: wins, then draws (a draw beats a loss), then point differential. */
export const standingsSort = (a: TeamStat, b: TeamStat): number =>
  b.wins - a.wins ||
  b.draws - a.draws ||
  b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)

/** "12-4" or "12-4-1" once a draw exists — the record string shown next to an owner. */
export const recordLabel = (s: Pick<TeamStat, 'wins' | 'losses' | 'draws'>): string =>
  s.draws > 0 ? `${s.wins}-${s.losses}-${s.draws}` : `${s.wins}-${s.losses}`

// ── Win share (donut) ───────────────────────────────────────────────────────

export type WinShareSlice = { id: number; owner: string; value: number; color: string }

export function buildWinShare(stats: TeamStat[]): { slices: WinShareSlice[]; totalWins: number } {
  const played = [...stats].filter((s) => s.games > 0).sort(standingsSort)
  const slices = played
    .filter((s) => s.wins > 0)
    .map((s) => ({ id: s.id, owner: ownerLabel(s), value: s.wins, color: s.color ?? PRIMARY }))
  const totalWins = played.reduce((a, s) => a + s.wins, 0)
  return { slices, totalWins }
}

// ── Head-to-head matrix ─────────────────────────────────────────────────────

export type H2HTeam = { id: number; owner: string; color: string }
export type HeadToHead = {
  teams: H2HTeam[]
  /** matrix[rowId][colId] = the row team's record vs the col team. */
  matrix: Record<number, Record<number, { w: number; l: number; d: number }>>
}

export function buildHeadToHead(franchises: FranchiseRow[], matches: RawMatch[]): HeadToHead {
  const order = [...franchises]
  const teams: H2HTeam[] = order.map((f, i) => ({
    id: f.id,
    owner: f.owner ?? f.name,
    color: seriesColor(f.color, i),
  }))
  const matrix: HeadToHead['matrix'] = {}
  for (const t of teams) matrix[t.id] = {}

  const bump = (a: number, b: number, result: 'w' | 'l' | 'd') => {
    if (!matrix[a] || !matrix[b]) return
    matrix[a][b] ??= { w: 0, l: 0, d: 0 }
    matrix[a][b][result]++
  }

  for (const m of resolve(matches)) {
    if (m.homeScore === m.awayScore) {
      bump(m.homeId, m.awayId, 'd')
      bump(m.awayId, m.homeId, 'd')
      continue
    }
    const homeWon = m.homeScore > m.awayScore
    bump(m.homeId, m.awayId, homeWon ? 'w' : 'l')
    bump(m.awayId, m.homeId, homeWon ? 'l' : 'w')
  }
  // Keep only teams that have played at least one tracked game.
  const active = teams.filter((t) => Object.keys(matrix[t.id]).length > 0)
  return { teams: active, matrix }
}

// ── Form guide (last 5) ─────────────────────────────────────────────────────

export type FormResult = { result: 'W' | 'L' | 'D'; walkover: boolean }
export type FormRow = {
  id: number
  owner: string
  color: string
  results: FormResult[] // oldest → newest, up to 5
}

export function buildForm(franchises: FranchiseRow[], matches: RawMatch[]): FormRow[] {
  const seq = new Map<number, FormResult[]>()
  for (const f of franchises) seq.set(f.id, [])

  for (const m of resolve(matches)) {
    if (m.homeScore === m.awayScore) {
      seq.get(m.homeId)?.push({ result: 'D', walkover: m.walkover })
      seq.get(m.awayId)?.push({ result: 'D', walkover: m.walkover })
      continue
    }
    const homeWon = m.homeScore > m.awayScore
    seq.get(m.homeId)?.push({ result: homeWon ? 'W' : 'L', walkover: m.walkover })
    seq.get(m.awayId)?.push({ result: homeWon ? 'L' : 'W', walkover: m.walkover })
  }

  return franchises
    .map((f, i) => ({
      id: f.id,
      owner: f.owner ?? f.name,
      color: seriesColor(f.color, i),
      results: (seq.get(f.id) ?? []).slice(-5),
    }))
    .filter((r) => r.results.length > 0)
}

// ── Record highlights ───────────────────────────────────────────────────────

export type Records = {
  highestTeamScore: { owner: string; color: string; score: number; vs: string; date: string } | null
  biggestBlowout: { winner: string; loser: string; margin: number; score: string; date: string } | null
  closestGame: { a: string; b: string; margin: number; score: string; date: string } | null
  highestScoringMatch: { a: string; b: string; total: number; score: string; date: string } | null
  longestStreak: { owner: string; color: string; length: number } | null
}

export function buildRecords(franchises: FranchiseRow[], matches: RawMatch[]): Records {
  const byId = new Map<number, { owner: string; color: string }>()
  franchises.forEach((f, i) =>
    byId.set(f.id, { owner: f.owner ?? f.name, color: seriesColor(f.color, i) }),
  )
  const name = (id: number) => byId.get(id)?.owner ?? '—'

  // "Real" games only — walkovers are forfeits, not highlight material.
  const real = resolve(matches).filter((m) => !m.walkover)

  const records: Records = {
    highestTeamScore: null,
    biggestBlowout: null,
    closestGame: null,
    highestScoringMatch: null,
    longestStreak: null,
  }

  for (const m of real) {
    const date = fmtDate(m.playedAt)
    const margin = Math.abs(m.homeScore - m.awayScore)
    const total = m.homeScore + m.awayScore
    const homeWon = m.homeScore > m.awayScore

    // Highest single-team score
    const topId = homeWon ? m.homeId : m.awayScore > m.homeScore ? m.awayId : m.homeId
    const topScore = Math.max(m.homeScore, m.awayScore)
    const topVs = topId === m.homeId ? m.awayId : m.homeId
    if (!records.highestTeamScore || topScore > records.highestTeamScore.score) {
      const meta = byId.get(topId)
      records.highestTeamScore = {
        owner: meta?.owner ?? '—',
        color: meta?.color ?? PRIMARY,
        score: topScore,
        vs: name(topVs),
        date,
      }
    }

    // Biggest blowout (decisive games only)
    if (margin > 0 && (!records.biggestBlowout || margin > records.biggestBlowout.margin)) {
      const winId = homeWon ? m.homeId : m.awayId
      const loseId = homeWon ? m.awayId : m.homeId
      records.biggestBlowout = {
        winner: name(winId),
        loser: name(loseId),
        margin,
        score: `${Math.max(m.homeScore, m.awayScore)}–${Math.min(m.homeScore, m.awayScore)}`,
        date,
      }
    }

    // Closest game (decisive games only)
    if (margin > 0 && (!records.closestGame || margin < records.closestGame.margin)) {
      records.closestGame = {
        a: name(m.homeId),
        b: name(m.awayId),
        margin,
        score: `${m.homeScore}–${m.awayScore}`,
        date,
      }
    }

    // Highest-scoring match
    if (!records.highestScoringMatch || total > records.highestScoringMatch.total) {
      records.highestScoringMatch = {
        a: name(m.homeId),
        b: name(m.awayId),
        total,
        score: `${m.homeScore}–${m.awayScore}`,
        date,
      }
    }
  }

  // Longest win streak across all results (walkovers count as wins here)
  const streak = new Map<number, number>()
  let best: Records['longestStreak'] = null
  for (const m of resolve(matches)) {
    if (m.homeScore === m.awayScore) {
      // A draw isn't a win — it snaps both sides' streaks.
      streak.set(m.homeId, 0)
      streak.set(m.awayId, 0)
      continue
    }
    const winId = m.homeScore > m.awayScore ? m.homeId : m.awayId
    const loseId = winId === m.homeId ? m.awayId : m.homeId
    streak.set(winId, (streak.get(winId) ?? 0) + 1)
    streak.set(loseId, 0)
    const cur = streak.get(winId) ?? 0
    if (!best || cur > best.length) {
      const meta = byId.get(winId)
      best = { owner: meta?.owner ?? '—', color: meta?.color ?? PRIMARY, length: cur }
    }
  }
  if (best && best.length >= 2) records.longestStreak = best

  return records
}

// ── Scoring timeline ────────────────────────────────────────────────────────

export type TimelineSeries = { id: number; owner: string; color: string }
export type TimelinePoint = {
  label: string
  date: string
  game: number
  [owner: string]: number | string
}
export type Timeline = { series: TimelineSeries[]; data: TimelinePoint[] }

/** Cumulative points scored per owner across the season, one point per match. */
export function buildTimeline(franchises: FranchiseRow[], matches: RawMatch[]): Timeline {
  const played = resolve(matches)
  const active = new Set<number>()
  for (const m of played) {
    active.add(m.homeId)
    active.add(m.awayId)
  }
  const series: TimelineSeries[] = franchises
    .filter((f) => active.has(f.id))
    .map((f, i) => ({ id: f.id, owner: f.owner ?? f.name, color: seriesColor(f.color, i) }))

  if (series.length === 0 || played.length === 0) return { series, data: [] }

  const cum = new Map<number, number>()
  for (const f of series) cum.set(f.id, 0)
  const ownerOf = new Map<number, string>(series.map((s) => [s.id, s.owner]))

  const data: TimelinePoint[] = []
  played.forEach((m, idx) => {
    cum.set(m.homeId, (cum.get(m.homeId) ?? 0) + m.homeScore)
    cum.set(m.awayId, (cum.get(m.awayId) ?? 0) + m.awayScore)
    const date = fmtDate(m.playedAt)
    const point: TimelinePoint = { label: `${date} · G${idx + 1}`, date, game: idx + 1 }
    for (const s of series) point[ownerOf.get(s.id) as string] = cum.get(s.id) ?? 0
    data.push(point)
  })
  return { series, data }
}
