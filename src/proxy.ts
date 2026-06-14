import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Route protection for the commissioner area (Next 16 "proxy" convention,
 * formerly "middleware"). Runs BEFORE any page renders, so a signed-out request
 * gets a real server-side redirect to /login with no commissioner HTML/data
 * ever sent to the client.
 *
 * It only checks for the presence of the session cookie (the cookie's lifetime
 * is pinned to the 10h token expiry, so "no cookie" == "no/expired session").
 * The role check (commissioner vs team owner) and full token validation happen
 * in the commissioner layout via Payload's auth.
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.has('payload-token')) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/commissioner/:path*'],
}
