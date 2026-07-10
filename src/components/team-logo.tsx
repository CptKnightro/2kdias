import { cn } from '@/lib/utils'

/**
 * NBA team logos served from public/logos, resolved from the franchise name.
 * Franchises without a matching file keep the classic color-dot look, so
 * custom-named teams degrade gracefully.
 */
const LOGOS: Record<string, string> = {
  lakers: '/logos/lakers.svg',
  raptors: '/logos/raptors.png', // retro 1995 purple dinosaur logo
  nets: '/logos/nets.svg',
  heat: '/logos/heat.svg',
  thunder: '/logos/okc.svg',
  thunders: '/logos/okc.svg',
  okc: '/logos/okc.svg',
}

export function teamLogoSrc(name?: string | null): string | null {
  if (!name) return null
  const key = name.trim().toLowerCase()
  if (LOGOS[key]) return LOGOS[key]
  for (const k of Object.keys(LOGOS)) {
    if (key.includes(k)) return LOGOS[k]
  }
  return null
}

export function TeamLogo({
  name,
  color,
  size = 20,
  className,
}: {
  name?: string | null
  /** Fallback dot color when the name has no logo file. Omit to render nothing. */
  color?: string | null
  size?: number
  className?: string
}) {
  const src = teamLogoSrc(name)
  if (!src) {
    if (!color) return null
    const dot = Math.max(8, Math.round(size * 0.45))
    return (
      <span
        aria-hidden
        className={cn('shrink-0 rounded-full', className)}
        style={{ width: dot, height: dot, background: color }}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVGs in /public; next/image blocks SVG without dangerouslyAllowSVG
    <img
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={cn('shrink-0 object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]', className)}
      style={{ width: size, height: size }}
    />
  )
}
