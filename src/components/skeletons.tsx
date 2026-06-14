import * as React from 'react'
import { cn } from '@/lib/utils'

/** Base shimmer block. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-foreground/10', className)} aria-hidden />
}

/**
 * Reasonable generic page skeleton — a header placeholder, a stat row, and a
 * list of content rows. Used by route `loading.tsx` files (shown while a page
 * streams/regenerates) and as the in-page body when the DB is unreachable, so a
 * failure reads as "still loading" rather than a broken/empty screen.
 */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* header */}
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      {/* stat row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      {/* content rows */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
