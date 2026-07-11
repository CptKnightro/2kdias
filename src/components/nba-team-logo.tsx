import { cn } from '@/lib/utils'
import { nbaLogoSrc } from '@/lib/nba-logos'

/**
 * Small NBA team crest resolved from a player's `nbaTeam` string. Renders
 * nothing for all-decade / all-star groupings (no single team), so callers can
 * drop it inline next to the team name and it just disappears when N/A.
 */
export function NbaTeamLogo({
  team,
  size = 16,
  className,
}: {
  team?: string | null
  size?: number
  className?: string
}) {
  const src = nbaLogoSrc(team)
  if (!src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static PNGs in /public; next/image is overkill for a 16px crest
    <img
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading="lazy"
      className={cn('shrink-0 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]', className)}
      style={{ width: size, height: size }}
    />
  )
}
