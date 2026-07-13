'use client'

import * as React from 'react'
import { Crown, Trophy } from '@phosphor-icons/react'

/** Props shared by Phosphor icons and our custom glyphs. */
type IconProps = {
  size?: number
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
  className?: string
}

/**
 * Championship ring — Phosphor has no ring glyph, so this is a hand-drawn
 * band + gem on the same 256 grid, filled with currentColor to match the
 * Phosphor "fill" weight it sits alongside.
 */
export function RingIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M128 224a64 64 0 1 1 0-128 64 64 0 1 1 0 128Zm0-26a38 38 0 1 0 0-76 38 38 0 1 0 0 76Z"
      />
      <path d="M128 20l36 42-36 42-36-42z" />
    </svg>
  )
}

/**
 * The pickable trophy icons — the commissioner cycles through these by
 * clicking the icon on a trophy card; the choice renders on the Trophies page.
 */
export const TROPHY_ICONS: Record<string, React.ComponentType<IconProps>> = {
  trophy: Trophy,
  ring: RingIcon,
  crown: Crown,
}

export type TrophyIconKey = keyof typeof TROPHY_ICONS

export const TROPHY_ICON_KEYS = Object.keys(TROPHY_ICONS)

/** Resolve a stored icon key (or null) to a component, defaulting by trophy kind. */
export function trophyIcon(icon: string | null | undefined, kind: 'recurring' | 'final') {
  if (icon && icon in TROPHY_ICONS) return TROPHY_ICONS[icon]
  return kind === 'final' ? Crown : Trophy
}
