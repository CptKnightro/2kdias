/**
 * Trade timing helpers — pure + client-safe (no Payload import).
 *
 * A trade is a **temporary loan**. While it's open it carries an accept-by
 * deadline (`expiresAt`); once accepted it becomes an active loan for a window
 * (`startsAt` → `endsAt`), during which the offered/requested players play for
 * the other team. When `endsAt` passes the players revert to their original
 * teams. The actual player moves + state transitions live in
 * `src/lib/trades-server.ts`; this module is just dates + formatting.
 */

export type DurationUnit = 'days' | 'weeks' | 'months'

/** League rule: a loan / offer can run for at most three months. */
export const MAX_TRADE_MONTHS = 3
export const MAX_TRADE_DAYS = 90

/** Statuses for an offer that hasn't been settled yet (can still expire). */
export const PENDING_TRADE_STATUSES = ['proposed', 'countered'] as const

/** Convert a {value, unit} duration to whole days, clamped to the 3-month cap. */
export function durationToDays(
  value: number | string | undefined,
  unit: DurationUnit | undefined,
): number {
  const v = Math.floor(Number(value))
  const n = Number.isFinite(v) && v > 0 ? v : 3
  const days = unit === 'weeks' ? n * 7 : unit === 'months' ? n * 30 : n
  return Math.min(MAX_TRADE_DAYS, Math.max(1, days))
}

/** Add whole days to an ISO timestamp, returning a new ISO string. */
export function addDaysISO(fromISO: string, days: number): string {
  const d = new Date(fromISO)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

/**
 * ISO deadline `value` units from now, clamped so it never lands more than
 * {@link MAX_TRADE_MONTHS} months out. Falls back to 3 days when missing.
 */
export function computeExpiresAt(
  value: number | string | undefined,
  unit: DurationUnit | undefined,
): string {
  return addDaysISO(new Date().toISOString(), durationToDays(value, unit))
}

/** Whether `now` is past a still-open offer's accept-by deadline. */
export function isTradeExpired(status: string, expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  if (!PENDING_TRADE_STATUSES.includes(status as (typeof PENDING_TRADE_STATUSES)[number]))
    return false
  return new Date(expiresAt).getTime() <= Date.now()
}

/**
 * Compact "time from now" for an ISO instant. Returns `null` when there's no
 * instant; `{ past: true }` once it's elapsed. `short` is like `2d 4h` — the
 * caller prefixes it ("Expires in …", "Returns in …").
 */
export function timeUntil(iso: string | null | undefined): { past: boolean; short: string } | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return { past: true, short: 'now' }

  const mins = Math.floor(ms / 60_000)
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  if (days >= 1) return { past: false, short: `${days}d${hours ? ` ${hours}h` : ''}` }
  const m = mins % 60
  if (hours >= 1) return { past: false, short: `${hours}h${m ? ` ${m}m` : ''}` }
  return { past: false, short: `${Math.max(1, mins)}m` }
}

/** Short date label like `Jul 4` for a loan window endpoint. */
export function shortDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
