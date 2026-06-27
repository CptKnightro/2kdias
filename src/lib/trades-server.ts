import 'server-only'
import type { Payload } from 'payload'
import type { Trade } from '@/payload-types'
import { addDaysISO } from '@/lib/trades'

/**
 * Server-side trade loan mechanics — the bits that actually move players.
 *
 * A trade encodes both ends of the swap: `offeredPlayers` start on
 * `fromFranchise`, `requestedPlayers` start on `toFranchise`. So activating and
 * reverting a loan are just symmetric franchise reassignments — no separate
 * "original team" bookkeeping needed. Every write uses `overrideAccess` because
 * these run from public/page contexts with no signed-in user.
 */

const DEFAULT_LOAN_DAYS = 7

const numId = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id: number }).id ?? null) : Number(v)

const idList = (v: unknown): number[] =>
  Array.isArray(v) ? v.map(numId).filter((x): x is number => x != null) : []

/**
 * Reassign a loan's players. `activate` sends them to the other team;
 * `revert` returns them to their original team. Idempotent — it sets absolute
 * franchises, so running it twice is harmless.
 */
export async function applyLoanSwap(
  payload: Payload,
  trade: Pick<Trade, 'fromFranchise' | 'toFranchise' | 'offeredPlayers' | 'requestedPlayers'>,
  mode: 'activate' | 'revert',
): Promise<void> {
  const from = numId(trade.fromFranchise)
  const to = numId(trade.toFranchise)
  if (from == null || to == null) return

  const offered = idList(trade.offeredPlayers)
  const requested = idList(trade.requestedPlayers)
  const offeredDest = mode === 'activate' ? to : from
  const requestedDest = mode === 'activate' ? from : to

  if (offered.length)
    await payload.update({
      collection: 'players',
      where: { id: { in: offered } },
      data: { franchise: offeredDest },
      overrideAccess: true,
    })
  if (requested.length)
    await payload.update({
      collection: 'players',
      where: { id: { in: requested } },
      data: { franchise: requestedDest },
      overrideAccess: true,
    })
}

/** Loan length (days) for a trade — derived from its accept-by window, else default. */
function loanDaysFor(trade: Pick<Trade, 'expiresAt' | 'createdAt'>): number {
  if (trade.expiresAt && trade.createdAt) {
    const ms = new Date(trade.expiresAt).getTime() - new Date(trade.createdAt).getTime()
    const days = Math.round(ms / 86_400_000)
    if (days >= 1) return days
  }
  return DEFAULT_LOAN_DAYS
}

/**
 * Turn a trade into an active loan: stamp the window and move the players to the
 * other team. `startsAtISO`/`endsAtISO` override the computed window (used when
 * back-dating a loan). Returns the window that was applied.
 */
export async function activateLoan(
  payload: Payload,
  tradeId: number,
  opts?: { startsAtISO?: string; endsAtISO?: string; loanDays?: number },
): Promise<{ startsAt: string; endsAt: string }> {
  const trade = await payload.findByID({ collection: 'trades', id: tradeId, depth: 0 })
  const startsAt = opts?.startsAtISO ?? new Date().toISOString()
  const endsAt = opts?.endsAtISO ?? addDaysISO(startsAt, opts?.loanDays ?? loanDaysFor(trade))

  await payload.update({
    collection: 'trades',
    id: tradeId,
    data: { startsAt, endsAt },
    overrideAccess: true,
  })
  await applyLoanSwap(payload, trade, 'activate')
  return { startsAt, endsAt }
}

/** Revert an active loan's players to their original teams. */
export async function revertLoan(payload: Payload, tradeId: number): Promise<void> {
  const trade = await payload.findByID({ collection: 'trades', id: tradeId, depth: 0 })
  await applyLoanSwap(payload, trade, 'revert')
}

/**
 * Reconcile trade state — call from any page that lists trades. Two passes:
 *   1. Open offers past their accept-by deadline → `expired` (no players moved).
 *   2. Active loans past `endsAt` → players reverted, then marked `expired`.
 * Only writes when something is actually due, so it's cheap on the hot path.
 */
export async function syncTradeStates(payload: Payload): Promise<void> {
  const now = new Date().toISOString()

  const staleProposals = await payload.find({
    collection: 'trades',
    where: {
      and: [{ status: { in: ['proposed', 'countered'] } }, { expiresAt: { less_than_equal: now } }],
    },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  if (staleProposals.docs.length)
    await payload.update({
      collection: 'trades',
      where: { id: { in: staleProposals.docs.map((t) => t.id) } },
      data: { status: 'expired' },
      overrideAccess: true,
    })

  const endedLoans = await payload.find({
    collection: 'trades',
    where: { and: [{ status: { equals: 'accepted' } }, { endsAt: { less_than_equal: now } }] },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  for (const t of endedLoans.docs) {
    await applyLoanSwap(payload, t, 'revert')
    await payload.update({
      collection: 'trades',
      id: t.id,
      data: { status: 'expired' },
      overrideAccess: true,
    })
  }
}
