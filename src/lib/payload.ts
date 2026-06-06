import { getPayload, type Payload } from 'payload'
import config from '@payload-config'

// Cached Payload instance for use in Server Components / Server Actions.
export const getPayloadClient = async () => getPayload({ config: await config })

/**
 * Run a Payload query, returning a fallback (and dbReady:false) if the database
 * isn't reachable yet — lets the UI render a "connect your database" state
 * before Supabase env is configured rather than throwing a 500.
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
