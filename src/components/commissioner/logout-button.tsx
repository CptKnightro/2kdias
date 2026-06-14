'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { SignOut } from '@phosphor-icons/react'
import { logout } from '@/app/(frontend)/login/actions'
import { cn } from '@/lib/utils'

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [pending, start] = React.useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await logout()
          router.replace('/login')
          router.refresh()
        })
      }
      className={cn(
        'skeuo inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-primary disabled:opacity-60',
        className,
      )}
    >
      <SignOut weight="bold" size={16} />
      Sign out
    </button>
  )
}
