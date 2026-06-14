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
  } catch {
    return { data: fallback, dbReady: false }
  }
}

/** Resolve a Payload upload relation to a usable image URL. */
export function mediaUrl(media: unknown): string | null {
  if (!media || typeof media !== 'object') return null
  const m = media as { url?: string | null }
  return m.url ?? null
}
