'use server'

import { headers as nextHeaders } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'
import { isCommissioner } from '@/access/roles'

type Result = { ok: boolean; error?: string }

async function getUser() {
  const payload = await getPayloadClient()
  const headers = await nextHeaders()
  const { user } = await payload.auth({ headers })
  return { payload, user }
}

/** Owner (or commissioner) places a bid. Validation lives in the Bids hook. */
export async function placeBid(input: {
  auctionId: string
  franchiseId: string
  amount: number
}): Promise<Result> {
  const { payload, user } = await getUser()
  if (!user) return { ok: false, error: 'You must be signed in to bid.' }
  try {
    await payload.create({
      collection: 'bids',
      data: {
        auction: Number(input.auctionId),
        franchise: Number(input.franchiseId),
        amount: input.amount,
      },
      user,
      overrideAccess: false,
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
