'use server'

import { cookies } from 'next/headers'
import { getPayloadClient } from '@/lib/payload'

const TEN_HOURS = 60 * 60 * 10

export type LoginResult = { ok: boolean; error?: string; role?: 'commissioner' | 'owner' }

/**
 * Authenticate against Payload's user auth and set the httpOnly session cookie.
 * The cookie + JWT both expire in 10 hours; after that the user must sign in
 * again (no auto-refresh).
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const e = email.trim().toLowerCase()
  if (!e || !password) return { ok: false, error: 'Email and password are required.' }

  try {
    const payload = await getPayloadClient()
    const result = await payload.login({
      collection: 'users',
      data: { email: e, password },
    })
    if (!result?.token) return { ok: false, error: 'Invalid email or password.' }

    const cookieStore = await cookies()
    cookieStore.set('payload-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TEN_HOURS,
    })
    return { ok: true, role: result.user?.role as 'commissioner' | 'owner' }
  } catch (err) {
    // Payload throws on bad credentials / locked account — keep the message
    // generic so we don't leak which part failed, but surface lockouts.
    const msg = (err as Error).message || ''
    if (/locked/i.test(msg)) {
      return { ok: false, error: 'Account locked after too many attempts. Try again later.' }
    }
    return { ok: false, error: 'Invalid email or password.' }
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('payload-token')
}
