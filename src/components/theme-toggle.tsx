'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const isDark = mounted ? resolvedTheme === 'dark' : true

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'skeuo relative grid h-9 w-9 place-items-center rounded-full text-foreground/80 transition-colors hover:text-primary',
        className,
      )}
    >
      {isDark ? <Sun weight="bold" size={18} /> : <Moon weight="bold" size={18} />}
    </button>
  )
}
