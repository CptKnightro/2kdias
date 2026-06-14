'use client'

import * as React from 'react'
import { toast } from 'sonner'

/**
 * Fires a single error toast when a page couldn't reach the database. Rendered
 * by server pages in their `!dbReady` branch (the page body shows a skeleton).
 * The shared `id` dedupes it so navigating between failing pages won't stack
 * toasts, and the toast auto-dismisses.
 */
export function DbErrorToast({
  message = 'Couldn’t reach the server',
  description = 'Having trouble loading live data — retrying shortly.',
}: {
  message?: string
  description?: string
}) {
  React.useEffect(() => {
    toast.error(message, { id: 'db-unreachable', description })
  }, [message, description])
  return null
}
