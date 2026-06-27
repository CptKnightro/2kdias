import type { Icon } from '@phosphor-icons/react'
import { GlassPanel } from '@/components/ui-bits'
import { cn } from '@/lib/utils'

/** Glass panel with an icon + uppercase title — the shell for every dashboard chart. */
export function ChartCard({
  title,
  icon: IconCmp,
  hint,
  children,
  className,
  fill,
}: {
  title: string
  icon: Icon
  hint?: string
  children: React.ReactNode
  className?: string
  /** Stretch to the grid row height and vertically center the body (keeps paired cards even). */
  fill?: boolean
}) {
  return (
    <GlassPanel className={cn('p-5', fill && 'flex h-full flex-col', className)}>
      <div className="mb-4 flex items-center gap-2">
        <IconCmp weight="bold" size={16} className="text-primary" />
        <h3 className="font-display text-sm font-black uppercase tracking-wide">{title}</h3>
        {hint && <span className="ml-auto text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {fill ? <div className="flex flex-1 flex-col justify-center">{children}</div> : children}
    </GlassPanel>
  )
}
