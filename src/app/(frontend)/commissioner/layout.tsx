import * as React from 'react'
import Link from 'next/link'
import { Crown, Lock, House, SignIn } from '@phosphor-icons/react/dist/ssr'
import { CommishNav } from '@/components/commissioner/commish-nav'
import { LogoutButton } from '@/components/commissioner/logout-button'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Commissioner' }

function Gate({
  icon,
  title,
  children,
  actions,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  actions: React.ReactNode
}) {
  return (
    <div className="grid min-h-[calc(100vh-12rem)] place-items-center">
      <div className="glass-strong w-[min(92vw,26rem)] space-y-4 rounded-3xl p-8 text-center">
        <span className="skeuo mx-auto grid h-14 w-14 place-items-center rounded-2xl text-primary">
          {icon}
        </span>
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{children}</p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">{actions}</div>
      </div>
    </div>
  )
}

export default async function CommissionerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  // Middleware already redirects requests with no session cookie to /login.
  // Reaching here with no user means a present-but-invalid/expired token — show
  // a sign-in prompt and render NO children (so no commissioner data leaks).
  if (!user) {
    return (
      <Gate
        icon={<SignIn weight="bold" size={28} />}
        title="Session expired"
        actions={
          <Link
            href="/login?next=/commissioner"
            className="skeuo-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <SignIn weight="bold" size={16} /> Sign in again
          </Link>
        }
      >
        Your session has ended. Please sign in again to continue.
      </Gate>
    )
  }

  // Team owners are signed in but not allowed in the commissioner area.
  if (user.role !== 'commissioner') {
    return (
      <Gate
        icon={<Lock weight="bold" size={28} />}
        title="Commissioner only"
        actions={
          <>
            <Link
              href="/"
              className="skeuo inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-primary"
            >
              <House weight="bold" size={16} /> Home
            </Link>
            <LogoutButton />
          </>
        }
      >
        You&rsquo;re signed in as <span className="font-semibold text-foreground">{user.name}</span> (team
        owner). This area is restricted to the commissioner.
      </Gate>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="skeuo grid h-11 w-11 place-items-center rounded-xl text-primary">
          <Crown weight="bold" size={22} />
        </span>
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Commissioner
          </h1>
          <p className="text-sm text-muted-foreground">Run the league — no Payload required.</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
          <LogoutButton />
        </div>
      </div>
      <CommishNav />
      {children}
    </div>
  )
}
