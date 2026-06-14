import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Sign in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const safeNext = next && next.startsWith('/') ? next : '/commissioner'

  // Already signed in as a commissioner → skip the form.
  const user = await getCurrentUser()
  if (user?.role === 'commissioner') redirect(safeNext)

  return (
    <div className="grid min-h-[calc(100vh-9rem)] place-items-center py-8">
      <LoginForm next={safeNext} />
    </div>
  )
}
