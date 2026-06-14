import 'server-only'
import { headers as nextHeaders } from 'next/headers'
import { getPayloadClient } from '@/lib/payload'
import type { User } from '@/payload-types'

/** The current signed-in user (or null). Never throws. */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const payload = await getPayloadClient()
    const headers = await nextHeaders()
    const { user } = await payload.auth({ headers })
    return (user as User) ?? null
  } catch {
    return null
  }
}

/**
 * Guard for commissioner-only server actions. Throws if the caller is not a
 * signed-in commissioner — defense in depth so actions can't be invoked
 * directly (POST) by a non-commissioner, independent of the UI gate.
 */
export async function requireCommissioner(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new Error('You must be signed in.')
  if (user.role !== 'commissioner') throw new Error('Commissioner access required.')
  return user
}
