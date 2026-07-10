'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Fires a single error toast when a page couldn't reach the database, then
 * *actually* retries: because these pages are dynamic, `router.refresh()`
 * re-runs the server render and re-hits the DB, so a momentary pooler blip
 * heals itself within a few seconds without a manual reload. The shared `id`
 * dedupes the toast; it's dismissed once the page recovers (this unmounts).
 */
export function DbErrorToast({
  message = 'Couldn’t reach the server',
  description = 'Having trouble loading live data — retrying…',
}: {
  message?: string
  description?: string
}) {
  const router = useRouter()
  React.useEffect(() => {
    toast.error(message, { id: 'db-unreachable', description })

    // Auto-retry a few times with backoff (~1.5s, 3s, 6s). A successful render
    // swaps in real content and unmounts this, cancelling the pending timer.
    let attempt = 0
    let timer: ReturnType<typeof setTimeout>
    const retry = () => {
      attempt += 1
      router.refresh()
      if (attempt < 3) timer = setTimeout(retry, 1500 * (attempt + 1))
    }
    timer = setTimeout(retry, 1500)

    return () => {
      clearTimeout(timer)
      toast.dismiss('db-unreachable')
    }
  }, [message, description, router])
  return null
}
