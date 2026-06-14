'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  EnvelopeSimple,
  Lock,
  Eye,
  EyeSlash,
  WarningCircle,
  CircleNotch,
  SignIn,
} from '@phosphor-icons/react'
import { login } from './actions'

export function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [show, setShow] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, start] = React.useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    start(async () => {
      const res = await login(email, password)
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong')
        return
      }
      if (next.startsWith('/commissioner') && res.role !== 'commissioner') {
        toast.success('Signed in as team owner')
        router.replace('/')
      } else {
        toast.success('Signed in')
        router.replace(next)
      }
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={submit}
      className="glass-strong w-[min(92vw,24rem)] space-y-6 rounded-3xl p-7 sm:p-8"
      aria-labelledby="login-title"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Image
          src="/logo-full.png"
          alt="2KDais"
          width={1606}
          height={592}
          priority
          className="h-8 w-auto drop-shadow-[0_2px_10px_rgba(223,38,4,0.4)]"
        />
        <div>
          <h1 id="login-title" className="font-display text-3xl font-black uppercase tracking-tight">
            Sign in
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">League management access</p>
        </div>
      </div>

      <div className="space-y-3.5">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email
          </span>
          <div className="relative">
            <EnvelopeSimple
              weight="bold"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@2kdais.local"
              className="skeuo-inset w-full rounded-xl bg-transparent py-2.5 pl-10 pr-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Password
          </span>
          <div className="relative">
            <Lock
              weight="bold"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type={show ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="skeuo-inset w-full rounded-xl bg-transparent py-2.5 pl-10 pr-10 text-sm outline-none transition-shadow placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary/50"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              {show ? <EyeSlash weight="bold" size={18} /> : <Eye weight="bold" size={18} />}
            </button>
          </div>
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <WarningCircle weight="bold" size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="skeuo-btn flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? (
          <CircleNotch weight="bold" size={18} className="animate-spin" />
        ) : (
          <SignIn weight="bold" size={18} />
        )}
        {pending ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Don&rsquo;t have an account? Ask your commissioner to create one.
      </p>
    </form>
  )
}
