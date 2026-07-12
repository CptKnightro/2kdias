import { getPayload, type Payload } from 'payload'
import config from '@payload-config'

// Cached Payload instance for use in Server Components / Server Actions.
export const getPayloadClient = async () => getPayload({ config: await config })

// Postgres/pg connection-failure SQLSTATEs + Node socket errnos. These are
// *transient* — the query never reached a result, so a fresh attempt is safe.
const TRANSIENT_DB_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'ENETUNREACH',
  'EAI_AGAIN',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006', // connection_exception family
  '57P01',
  '57P03', // admin_shutdown / cannot_connect_now
  '53300', // too_many_connections (pooler saturated)
  'XX000', // internal_error (Supabase pooler emits this when overloaded)
])
const TRANSIENT_DB_MSG =
  /(connection terminated|connection timeout|timeout exceeded when trying to connect|too many clients|too many connections|max client connections|server closed the connection|connection reset|socket hang up|fetch failed|remaining connection slots|ECONNRESET|ECONNREFUSED|ETIMEDOUT)/i

/** True for momentary DB/pooler blips that are worth retrying (never logic/validation errors). */
export function isTransientDbError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string; cause?: unknown }
  if (e.code && TRANSIENT_DB_CODES.has(e.code)) return true
  if (e.message && TRANSIENT_DB_MSG.test(e.message)) return true
  if (e.cause && e.cause !== err) return isTransientDbError(e.cause) // pg wraps the socket error
  return false
}

/**
 * Retry an idempotent read through a transient DB/pooler blip before giving up.
 * Serverless functions hit a cold/saturated Supabase pooler often enough that a
 * single failure shouldn't dump the user to a skeleton — a short backoff almost
 * always lands. Only transient connection errors retry; real errors throw at once.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt === tries || !isTransientDbError(err)) throw err
      // Escalating backoff (200ms → 400 → 800 → 1500, ~2.9s total). A stale
      // connection on a thawed instance usually succeeds on the 2nd attempt
      // (fresh socket); the cold-start connection herd right after a deploy can
      // keep the pooler saturated a couple seconds, so absorb that here rather
      // than bouncing the user to a skeleton.
      await new Promise((r) => setTimeout(r, Math.min(1500, 200 * 2 ** (attempt - 1))))
    }
  }
  throw lastErr
}

/**
 * Run a Payload query, returning a fallback (and dbReady:false) if the database
 * isn't reachable — never throws, so static generation can't fail at build. On
 * dbReady:false pages render a <PageSkeleton /> body + fire a <DbErrorToast />
 * popup rather than a 500 or an inline setup dialog. Transient pooler blips are
 * retried first (see withDbRetry) so a single cold connection doesn't show one.
 */
export async function safeQuery<T>(
  fn: (payload: Payload) => Promise<T>,
  fallback: T,
): Promise<{ data: T; dbReady: boolean }> {
  try {
    const payload = await getPayloadClient()
    return { data: await withDbRetry(() => fn(payload)), dbReady: true }
  } catch (err) {
    // During the production build/prerender, swallowing would bake a skeleton
    // into the static cache and serve it for the whole revalidate window. Fail
    // the build instead so Vercel keeps the last good deployment. At runtime we
    // stay graceful (page renders <PageSkeleton/> + a <DbErrorToast/> popup).
    if (process.env.NEXT_PHASE === 'phase-production-build') throw err
    return { data: fallback, dbReady: false }
  }
}

/** Resolve a Payload upload relation to a usable image URL. */
export function mediaUrl(media: unknown): string | null {
  if (!media || typeof media !== 'object') return null
  const m = media as { url?: string | null }
  return m.url ?? null
}
