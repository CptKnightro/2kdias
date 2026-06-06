import * as React from 'react'
import Link from 'next/link'
import { Database } from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  subtitle,
  icon: IconCmp,
  action,
}: {
  title: string
  subtitle?: string
  icon?: Icon
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {IconCmp && (
          <span className="skeuo grid h-11 w-11 place-items-center rounded-xl text-primary">
            <IconCmp weight="bold" size={22} />
          </span>
        )}
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function GlassPanel({
  className,
  children,
  strong,
}: {
  className?: string
  children: React.ReactNode
  strong?: boolean
}) {
  return (
    <div className={cn(strong ? 'glass-strong' : 'glass', 'rounded-2xl', className)}>
      {children}
    </div>
  )
}

export function StatTile({
  label,
  value,
  icon: IconCmp,
  accent,
}: {
  label: string
  value: React.ReactNode
  icon?: Icon
  accent?: boolean
}) {
  return (
    <div className="skeuo rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {IconCmp && (
          <IconCmp weight="bold" size={16} className={accent ? 'text-primary' : 'text-muted-foreground'} />
        )}
      </div>
      <div className={cn('mt-1 font-display text-2xl font-black', accent && 'text-primary')}>
        {value}
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  icon: IconCmp,
  cta,
}: {
  title: string
  description?: string
  icon?: Icon
  cta?: React.ReactNode
}) {
  return (
    <div className="glass flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center">
      {IconCmp && (
        <span className="skeuo mb-4 grid h-14 w-14 place-items-center rounded-2xl text-primary">
          <IconCmp weight="bold" size={28} />
        </span>
      )}
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  )
}

export function SetupBanner() {
  return (
    <div className="glass mb-6 flex flex-wrap items-center gap-3 rounded-2xl border-l-4 border-l-primary px-4 py-3">
      <Database weight="bold" size={20} className="text-primary" />
      <p className="text-sm">
        <span className="font-semibold">Database not connected yet.</span>{' '}
        <span className="text-muted-foreground">
          Add your Supabase credentials to <code className="rounded bg-foreground/10 px-1">.env</code>, run{' '}
          <code className="rounded bg-foreground/10 px-1">npm run migrate</code> then{' '}
          <code className="rounded bg-foreground/10 px-1">npm run seed</code>.
        </span>
      </p>
      <Link href="/admin" className="skeuo-btn ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold">
        Open Admin
      </Link>
    </div>
  )
}
