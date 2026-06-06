import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

export interface PlayerCardData {
  name: string
  ovr: number
  position?: string | null
  nbaTeam?: string | null
  category?: string | null
}

const SIZES: Record<Size, { pad: string; ovr: string; name: string; sub: string }> = {
  sm: { pad: 'p-3', ovr: 'text-2xl', name: 'text-sm', sub: 'text-[10px]' },
  md: { pad: 'p-4', ovr: 'text-3xl', name: 'text-base', sub: 'text-xs' },
  lg: { pad: 'p-6', ovr: 'text-5xl', name: 'text-2xl', sub: 'text-sm' },
}

export function PlayerCard({
  player,
  size = 'md',
  className,
}: {
  player: PlayerCardData
  size?: Size
  className?: string
}) {
  const s = SIZES[size]

  return (
    <div
      className={cn(
        'skeuo group relative flex flex-col gap-3 rounded-2xl transition-transform duration-200 hover:-translate-y-0.5',
        s.pad,
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col leading-none">
          <span className={cn('font-display font-black text-primary', s.ovr)}>{player.ovr}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            OVR
          </span>
        </div>
        {player.position && (
          <span
            className={cn(
              'skeuo-inset rounded-md px-2 py-1 font-display font-bold uppercase',
              s.sub,
            )}
          >
            {player.position}
          </span>
        )}
      </div>

      <div>
        <p className={cn('truncate font-display font-extrabold uppercase tracking-tight', s.name)}>
          {player.name}
        </p>
        {player.nbaTeam && (
          <span className={cn('truncate text-muted-foreground', s.sub)}>{player.nbaTeam}</span>
        )}
      </div>
    </div>
  )
}
