'use server'

import { headers as nextHeaders } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Payload } from 'payload'
import { getPayloadClient } from '@/lib/payload'
import { isCommissioner } from '@/access/roles'

type Result = { ok: boolean; error?: string }

async function getUser() {
  const payload = await getPayloadClient()
  const headers = await nextHeaders()
  const { user } = await payload.auth({ headers })
  return { payload, user }
}

/**
 * Place a bid. Login-free — the bidder picks a team on the auction page, so
 * anyone on the couch can bid for that team (mirrors the public match log).
 * Validation lives in the Bids `beforeValidate` hook.
 */
export async function placeBid(input: {
  auctionId: string
  franchiseId: string
  amount: number
}): Promise<Result> {
  const { payload, user } = await getUser()
  try {
    await payload.create({
      collection: 'bids',
      data: {
        auction: Number(input.auctionId),
        franchise: Number(input.franchiseId),
        amount: input.amount,
      },
      // overrideAccess skips the `authenticated` create rule; the Bids hook
      // still enforces purse / increment / squad-cap. A signed-in user is still
      // passed through so an owner stays pinned to their own team.
      user: user ?? undefined,
      overrideAccess: true,
    })
    revalidatePath('/auction')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Commissioner: put a player on the block (resets the lot). */
export async function setLot(auctionId: string, playerId: string): Promise<Result> {
  const { payload, user } = await getUser()
  if (!isCommissioner(user)) return { ok: false, error: 'Commissioner only.' }
  try {
    const pid = Number(playerId)
    const player = await payload.findByID({ collection: 'players', id: pid, depth: 0 })
    await payload.update({
      collection: 'auctions',
      id: Number(auctionId),
      data: {
        currentPlayer: pid,
        currentHighBid: player.basePrice ?? 1,
        currentHighFranchise: null,
        lotStatus: 'open',
        status: 'live',
      },
      user,
    })
    revalidatePath('/auction')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Commissioner: advance the gavel (going once / twice). */
export async function setLotStatus(
  auctionId: string,
  lotStatus: 'open' | 'going1' | 'going2',
): Promise<Result> {
  const { payload, user } = await getUser()
  if (!isCommissioner(user)) return { ok: false, error: 'Commissioner only.' }
  try {
    await payload.update({ collection: 'auctions', id: Number(auctionId), data: { lotStatus }, user })
    revalidatePath('/auction')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Commissioner: hammer the lot — assign player, charge purse, log it. */
export async function sellLot(auctionId: string): Promise<Result> {
  const { payload, user } = await getUser()
  if (!isCommissioner(user)) return { ok: false, error: 'Commissioner only.' }
  try {
    const auction = await payload.findByID({ collection: 'auctions', id: Number(auctionId), depth: 0 })
    const playerId =
      typeof auction.currentPlayer === 'object'
        ? auction.currentPlayer?.id
        : auction.currentPlayer
    const franchiseId =
      typeof auction.currentHighFranchise === 'object'
        ? auction.currentHighFranchise?.id
        : auction.currentHighFranchise
    const price = auction.currentHighBid ?? 0

    if (!playerId) return { ok: false, error: 'No player on the block.' }

    if (!franchiseId) {
      // no bids → unsold
      await payload.update({
        collection: 'players',
        id: playerId,
        data: { status: 'unsold' },
        user,
      })
      await payload.update({
        collection: 'auctions',
        id: auctionId,
        data: { lotStatus: 'unsold' },
        user,
      })
      revalidatePath('/auction')
      return { ok: true }
    }

    const [player, franchise] = await Promise.all([
      payload.findByID({ collection: 'players', id: playerId, depth: 0 }),
      payload.findByID({ collection: 'franchises', id: franchiseId, depth: 0 }),
    ])

    await payload.update({
      collection: 'players',
      id: playerId,
      data: { status: 'sold', franchise: franchiseId, soldPrice: price },
      user,
    })
    await payload.update({
      collection: 'franchises',
      id: franchiseId,
      data: { purseSpent: (franchise.purseSpent ?? 0) + price },
      user,
    })
    await payload.update({
      collection: 'auctions',
      id: auctionId,
      data: { lotStatus: 'sold' },
      user,
    })
    await payload.create({
      collection: 'activity',
      data: {
        type: 'auction',
        message: `${franchise.name} won ${player.name} for ${price}`,
        franchise: franchiseId,
      },
      overrideAccess: true,
    })
    revalidatePath('/auction')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Main / Mid auction lifecycle
// ════════════════════════════════════════════════════════════════════════════

/** All free-agent players (not on any team) — the auction pool. */
async function freeAgentIds(payload: Payload): Promise<number[]> {
  const res = await payload.find({
    collection: 'players',
    where: { franchise: { exists: false } },
    limit: 2000,
    depth: 0,
  })
  return res.docs.map((p) => p.id as number)
}

/**
 * Commissioner: open a MAIN auction. Every team will release all but the
 * retained limit; the live auction can't start until they have. Opens the
 * retention window and wipes any prior retention flags.
 */
export async function createMainAuction(input: {
  title: string
  retentionDeadline?: string
}): Promise<Result> {
  const { payload, user } = await getUser()
  if (!isCommissioner(user)) return { ok: false, error: 'Commissioner only.' }
  try {
    await payload.update({
      collection: 'auctions',
      where: { status: { equals: 'live' } },
      data: { status: 'ended', lotStatus: 'idle', currentPlayer: null },
    })
    await payload.update({
      collection: 'players',
      where: { retained: { equals: true } },
      data: { retained: false },
    })
    await payload.create({
      collection: 'auctions',
      data: {
        title: input.title || 'Main Auction',
        kind: 'main',
        status: 'scheduled',
        retentionOpen: true,
        retentionLimit: 3,
        retentionDeadline: input.retentionDeadline || null,
      },
      user,
    })
    await payload.create({
      collection: 'activity',
      data: { type: 'auction', message: 'Main auction opened — every team must retain 3 players.' },
      overrideAccess: true,
    })
    revalidatePath('/auction')
    revalidatePath('/')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Owner (or commissioner on a team's behalf): set the players a team keeps for a
 * main auction. Replaces that team's retention selection (≤ the limit).
 */
export async function setRetention(input: {
  auctionId: string
  playerIds: string[]
  franchiseId?: string
}): Promise<Result> {
  const { payload, user } = await getUser()
  if (!user) return { ok: false, error: 'Sign in to retain players.' }
  try {
    const auction = await payload.findByID({
      collection: 'auctions',
      id: Number(input.auctionId),
      depth: 0,
    })
    if (auction.kind !== 'main' || !auction.retentionOpen)
      return { ok: false, error: 'Retention is not open.' }
    const limit = auction.retentionLimit ?? 3

    let fid: number | null = null
    if (isCommissioner(user)) {
      fid = input.franchiseId ? Number(input.franchiseId) : null
    } else {
      fid = typeof user.franchise === 'object' ? (user.franchise?.id ?? null) : (user.franchise ?? null)
      if (input.franchiseId && Number(input.franchiseId) !== fid)
        return { ok: false, error: 'You can only retain your own team.' }
    }
    if (!fid) return { ok: false, error: 'No team linked to retain for.' }

    const ids = input.playerIds.map(Number).filter((x) => Number.isFinite(x))
    if (ids.length > limit) return { ok: false, error: `Retain at most ${limit} players.` }

    if (ids.length) {
      const owned = await payload.find({
        collection: 'players',
        where: { and: [{ id: { in: ids } }, { franchise: { equals: fid } }] },
        limit: ids.length,
        depth: 0,
      })
      if (owned.docs.length !== ids.length)
        return { ok: false, error: 'Those players are not on your team.' }
    }

    await payload.update({
      collection: 'players',
      where: { franchise: { equals: fid } },
      data: { retained: false },
    })
    if (ids.length) {
      await payload.update({
        collection: 'players',
        where: { id: { in: ids } },
        data: { retained: true },
      })
    }
    revalidatePath('/auction')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Commissioner: start the live MAIN auction. Gated — every team must have
 * retained exactly the limit. Releases all non-retained players, fully resets
 * purses (retained kept free), and pools the free agents into the queue.
 */
export async function startMainAuction(auctionId: string): Promise<Result> {
  const { payload, user } = await getUser()
  if (!isCommissioner(user)) return { ok: false, error: 'Commissioner only.' }
  try {
    const auction = await payload.findByID({ collection: 'auctions', id: Number(auctionId), depth: 0 })
    if (auction.kind !== 'main') return { ok: false, error: 'Not a main auction.' }
    const limit = auction.retentionLimit ?? 3

    const franchises = await payload.find({ collection: 'franchises', limit: 100, depth: 0 })
    const notReady: string[] = []
    for (const f of franchises.docs) {
      const c = await payload.count({
        collection: 'players',
        where: { and: [{ franchise: { equals: f.id } }, { retained: { equals: true } }] },
      })
      if (c.totalDocs !== limit) notReady.push(`${f.name} (${c.totalDocs}/${limit})`)
    }
    if (notReady.length) return { ok: false, error: `Teams not ready: ${notReady.join(', ')}.` }

    await payload.update({
      collection: 'players',
      where: { and: [{ franchise: { exists: true } }, { retained: { equals: false } }] },
      data: { franchise: null, status: 'available', soldPrice: null },
    })
    await payload.update({
      collection: 'franchises',
      where: { id: { exists: true } },
      data: { purseSpent: 0 },
    })
    const queue = await freeAgentIds(payload)
    // Fresh pool: clear any stale sold/unsold flags so the board starts clean.
    await payload.update({
      collection: 'players',
      where: { id: { in: queue } },
      data: { status: 'available', soldPrice: null },
    })
    await payload.update({
      collection: 'auctions',
      id: Number(auctionId),
      data: { status: 'live', retentionOpen: false, queue, lotStatus: 'idle', currentPlayer: null },
      user,
    })
    await payload.create({
      collection: 'activity',
      data: { type: 'auction', message: `Main auction is live — ${queue.length} players in the pool.` },
      overrideAccess: true,
    })
    revalidatePath('/auction')
    revalidatePath('/')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Commissioner: start a MID auction over the current free-agent pool. */
export async function createMidAuction(input: { title: string }): Promise<Result> {
  const { payload, user } = await getUser()
  if (!isCommissioner(user)) return { ok: false, error: 'Commissioner only.' }
  try {
    const queue = await freeAgentIds(payload)
    if (queue.length === 0) return { ok: false, error: 'No free-agent players to auction.' }
    await payload.update({
      collection: 'auctions',
      where: { status: { equals: 'live' } },
      data: { status: 'ended', lotStatus: 'idle', currentPlayer: null },
    })
    // Fresh pool: clear any stale sold/unsold flags so the board starts clean.
    await payload.update({
      collection: 'players',
      where: { id: { in: queue } },
      data: { status: 'available', soldPrice: null },
    })
    await payload.create({
      collection: 'auctions',
      data: { title: input.title || 'Mid Auction', kind: 'mid', status: 'live', queue, lotStatus: 'idle' },
      user,
    })
    await payload.create({
      collection: 'activity',
      data: { type: 'auction', message: `Mid auction is live — ${queue.length} free agents up for grabs.` },
      overrideAccess: true,
    })
    revalidatePath('/auction')
    revalidatePath('/')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Commissioner: end an auction. */
export async function endAuction(auctionId: string): Promise<Result> {
  const { payload, user } = await getUser()
  if (!isCommissioner(user)) return { ok: false, error: 'Commissioner only.' }
  try {
    await payload.update({
      collection: 'auctions',
      id: Number(auctionId),
      data: { status: 'ended', lotStatus: 'idle', currentPlayer: null, retentionOpen: false },
      user,
    })
    revalidatePath('/auction')
    revalidatePath('/')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Commissioner: clear a finished auction's recap. Empties the queue (which the
 * /auction page derives its results from) so the board resets to empty. Player
 * roster assignments and purses are untouched — only the display is wiped.
 */
export async function clearAuction(auctionId: string): Promise<Result> {
  const { payload, user } = await getUser()
  if (!isCommissioner(user)) return { ok: false, error: 'Commissioner only.' }
  try {
    await payload.update({
      collection: 'auctions',
      id: Number(auctionId),
      data: {
        status: 'ended',
        lotStatus: 'idle',
        currentPlayer: null,
        currentHighFranchise: null,
        currentHighBid: null,
        retentionOpen: false,
        queue: [],
      },
      user,
    })
    revalidatePath('/auction')
    revalidatePath('/')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
