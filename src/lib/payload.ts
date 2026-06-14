import { getPayload, type Payload } from 'payload'
import config from '@payload-config'

// Cached Payload instance for use in Server Components / Server Actions.
export const getPayloadClient = async () => getPayload({ config: await config })

/**
 * Run a Payload query, returning a fallback (and dbReady:false) if the database
 * isn't reachable — never throws, so static generation can't fail at build. On
 * dbReady:false pages render a <PageSkeleton /> body + fire a <DbErrorToast />
 * popup rather than a 500 or an inline setup dialog.
 */
export async function safeQuery<T>(
  fn: (payload: Payload) => Promise<T>,
  fallback: T,
): Promise<{ data: T; dbReady: boolean }> {
  try {
    const payload = await getPayloadClient()
    return { data: await fn(payload), dbReady: true }
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
