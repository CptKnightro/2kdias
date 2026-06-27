'use server'

import { revalidatePath } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'
import { requireCommissioner } from '@/lib/auth'
import { computeExpiresAt, durationToDays, isTradeExpired, type DurationUnit } from '@/lib/trades'
import { activateLoan, revertLoan } from '@/lib/trades-server'
import type { Player, Tournament, Match, Trade, Award, User } from '@/payload-types'

export type Result = { ok: boolean; error?: string; id?: number }

// — helpers ————————————————————————————————————————————————————————————————
const n = (v: unknown): number | undefined => {
  if (v === '' || v == null) return undefined
  const x = Number(v)
  return Number.isFinite(x) ? x : undefined
}
const s = (v: unknown): string | undefined => {
  const t = typeof v === 'string' ? v.trim() : v == null ? '' : String(v)
  return t === '' ? undefined : t
}
const ids = (v: unknown): number[] =>
  Array.isArray(v) ? v.map((x) => Number(x)).filter(Number.isFinite) : []

/** Revalidate the public pages affected by a change + the commissioner area. */
function purge(paths: string[]) {
  for (const p of [...paths, '/']) {
    try {
      if (p.includes('[')) revalidatePath(p, 'page')
      else revalidatePath(p)
    } catch {
      /* outside request scope — ignore */
    }
  }
}

async function run(fn: () => Promise<number | void>, paths: string[]): Promise<Result> {
  try {
    // Every mutation requires a signed-in commissioner — enforced server-side,
    // so these actions are safe even if invoked directly (not just via the UI).
    await requireCommissioner()
    const id = await fn()
    purge(paths)
    return { ok: true, id: typeof id === 'number' ? id : undefined }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// — Franchises ——————————————————————————————————————————————————————————————
const TEAM_PATHS = ['/teams', '/teams/[slug]', '/standings', '/players']

export async function saveFranchise(input: {
  id?: number
  name: string
  slug?: string
  color?: string
  owner?: string
  purseTotal?: string
  established?: string
  bio?: string
}): Promise<Result> {
  const data = {
    name: input.name,
    slug: s(input.slug),
    color: s(input.color) ?? '#DF2604',
    owner: n(input.owner) ?? null,
    purseTotal: n(input.purseTotal) ?? 100,
    established: n(input.established) ?? null,
    bio: s(input.bio) ?? null,
  }
  return run(async () => {
    const payload = await getPayloadClient()
    if (input.id) {
      await payload.update({ collection: 'franchises', id: input.id, data })
      return input.id
    }
    const doc = await payload.create({ collection: 'franchises', data })
    return doc.id as number
  }, TEAM_PATHS)
}

export async function deleteFranchise(id: number): Promise<Result> {
  return run(async () => {
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'franchises', id })
  }, TEAM_PATHS)
}

// — Players —————————————————————————————————————————————————————————————————
const PLAYER_PATHS = ['/players', '/teams', '/teams/[slug]']

export async function savePlayer(input: {
  id?: number
  name: string
  position?: string
  ovr?: string
  category?: string
  nbaTeam?: string
  status?: string
  franchise?: string
  basePrice?: string
  soldPrice?: string
}): Promise<Result> {
  const data = {
    name: input.name,
    position: s(input.position) as Player['position'],
    ovr: n(input.ovr) ?? 0,
    category: (s(input.category) ?? null) as Player['category'],
    nbaTeam: s(input.nbaTeam) ?? null,
    status: (s(input.status) ?? 'available') as Player['status'],
    franchise: n(input.franchise) ?? null,
    basePrice: n(input.basePrice) ?? null,
    soldPrice: n(input.soldPrice) ?? null,
  }
  return run(async () => {
    const payload = await getPayloadClient()
    if (input.id) {
      await payload.update({ collection: 'players', id: input.id, data })
      return input.id
    }
    const doc = await payload.create({ collection: 'players', data })
    return doc.id as number
  }, PLAYER_PATHS)
}

export async function deletePlayer(id: number): Promise<Result> {
  return run(async () => {
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'players', id })
  }, PLAYER_PATHS)
}

// — Tournaments —————————————————————————————————————————————————————————————
const COMP_PATHS = ['/tournaments', '/tournaments/[id]', '/standings', '/records', '/matches']

export async function saveTournament(input: {
  id?: number
  name: string
  format?: string
  status?: string
  season?: string
  participants?: string[]
  description?: string
  champion?: string
}): Promise<Result> {
  const data = {
    name: input.name,
    format: (s(input.format) ?? 'round-robin') as Tournament['format'],
    status: (s(input.status) ?? 'upcoming') as Tournament['status'],
    season: s(input.season) ?? null,
    participants: ids(input.participants),
    description: s(input.description) ?? null,
    champion: n(input.champion) ?? null,
  }
  return run(async () => {
    const payload = await getPayloadClient()
    if (input.id) {
      await payload.update({ collection: 'tournaments', id: input.id, data })
      return input.id
    }
    const doc = await payload.create({ collection: 'tournaments', data })
    return doc.id as number
  }, COMP_PATHS)
}

export async function deleteTournament(id: number): Promise<Result> {
  return run(async () => {
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'tournaments', id })
  }, COMP_PATHS)
}

// — Matches —————————————————————————————————————————————————————————————————
export async function saveMatch(input: {
  id?: number
  tournament?: string
  round?: string
  status?: string
  homeFranchise: string
  awayFranchise: string
  homeScore?: string
  awayScore?: string
  playedAt?: string
}): Promise<Result> {
  const data = {
    tournament: n(input.tournament) ?? null,
    round: s(input.round) ?? null,
    status: (s(input.status) ?? 'scheduled') as Match['status'],
    homeFranchise: n(input.homeFranchise)!,
    awayFranchise: n(input.awayFranchise)!,
    homeScore: n(input.homeScore) ?? null,
    awayScore: n(input.awayScore) ?? null,
    playedAt: s(input.playedAt) ?? null,
  }
  return run(async () => {
    const payload = await getPayloadClient()
    if (input.id) {
      await payload.update({ collection: 'matches', id: input.id, data })
      return input.id
    }
    const doc = await payload.create({ collection: 'matches', data })
    return doc.id as number
  }, COMP_PATHS)
}

export async function deleteMatch(id: number): Promise<Result> {
  return run(async () => {
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'matches', id })
  }, COMP_PATHS)
}

// — Trades ——————————————————————————————————————————————————————————————————
// Loans move players between rosters, so standings + team pages refresh too.
const TRADE_PATHS = ['/trades', '/teams', '/teams/[slug]', '/players', '/standings']

export async function createTrade(input: {
  fromFranchise: string
  toFranchise: string
  offeredPlayers?: string[]
  requestedPlayers?: string[]
  cashAdjustment?: string
  note?: string
  status?: string
  expiresInValue?: number | string
  expiresInUnit?: DurationUnit
}): Promise<Result> {
  const status = (s(input.status) ?? 'proposed') as Trade['status']
  // A deadline only applies to still-open offers; settled rows get no timer.
  const open = status === 'proposed' || status === 'countered'
  const data = {
    fromFranchise: n(input.fromFranchise)!,
    toFranchise: n(input.toFranchise)!,
    offeredPlayers: ids(input.offeredPlayers),
    requestedPlayers: ids(input.requestedPlayers),
    cashAdjustment: n(input.cashAdjustment) ?? 0,
    note: s(input.note) ?? null,
    status,
    expiresAt: open ? computeExpiresAt(input.expiresInValue, input.expiresInUnit) : null,
  }
  return run(async () => {
    const payload = await getPayloadClient()
    const doc = await payload.create({ collection: 'trades', data })
    // Recording a trade as already accepted starts the loan immediately.
    if (status === 'accepted') {
      await activateLoan(payload, doc.id as number, {
        loanDays: durationToDays(input.expiresInValue, input.expiresInUnit),
      })
    }
    return doc.id as number
  }, TRADE_PATHS)
}

export async function updateTradeStatus(id: number, status: string): Promise<Result> {
  return run(async () => {
    const payload = await getPayloadClient()
    const current = await payload.findByID({ collection: 'trades', id, depth: 0 })
    const wasActiveLoan = current.status === 'accepted'

    // Accepting starts the loan: stamp the window and move the players.
    if (status === 'accepted') {
      if (current.status === 'expired' || isTradeExpired(current.status ?? '', current.expiresAt)) {
        throw new Error('This trade has expired and can no longer be accepted.')
      }
      await payload.update({ collection: 'trades', id, data: { status: 'accepted' } })
      await activateLoan(payload, id)
      return
    }

    // Cancelling an active loan sends the players home first.
    if (wasActiveLoan && ['rejected', 'vetoed', 'expired'].includes(status)) {
      await revertLoan(payload, id)
    }
    await payload.update({ collection: 'trades', id, data: { status: status as Trade['status'] } })
  }, TRADE_PATHS)
}

export async function deleteTrade(id: number): Promise<Result> {
  return run(async () => {
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'trades', id })
  }, TRADE_PATHS)
}

// — Awards ——————————————————————————————————————————————————————————————————
const AWARD_PATHS = ['/records']

export async function createAward(input: {
  title: string
  type?: string
  season?: string
  franchise?: string
  player?: string
  note?: string
}): Promise<Result> {
  const data = {
    title: input.title,
    type: (s(input.type) ?? null) as Award['type'],
    season: s(input.season) ?? null,
    franchise: n(input.franchise) ?? null,
    player: n(input.player) ?? null,
    note: s(input.note) ?? null,
  }
  return run(async () => {
    const payload = await getPayloadClient()
    const doc = await payload.create({ collection: 'awards', data })
    return doc.id as number
  }, AWARD_PATHS)
}

export async function deleteAward(id: number): Promise<Result> {
  return run(async () => {
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'awards', id })
  }, AWARD_PATHS)
}

// — Users (settings) ————————————————————————————————————————————————————————
export async function createUser(input: {
  name: string
  email: string
  password: string
  role: string
  franchise?: string
}): Promise<Result> {
  if (!input.password || input.password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' }
  }
  return run(async () => {
    const payload = await getPayloadClient()
    const doc = await payload.create({
      collection: 'users',
      data: {
        name: input.name,
        email: (input.email || '').trim().toLowerCase(),
        password: input.password,
        role: (s(input.role) ?? 'owner') as User['role'],
        franchise: n(input.franchise) ?? null,
      },
    })
    return doc.id as number
  }, [])
}

export async function updateUserRole(id: number, role: string): Promise<Result> {
  return run(async () => {
    const payload = await getPayloadClient()
    await payload.update({ collection: 'users', id, data: { role: role as User['role'] } })
  }, [])
}

export async function deleteUser(id: number): Promise<Result> {
  const me = await requireCommissionerSafe()
  if (me && me.id === id) return { ok: false, error: 'You cannot delete your own account.' }
  return run(async () => {
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'users', id })
  }, [])
}

async function requireCommissionerSafe(): Promise<User | null> {
  try {
    return await requireCommissioner()
  } catch {
    return null
  }
}
