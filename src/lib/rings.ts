/**
 * The league runs two parallel competitions ("rings") over logged matches:
 * the original G.O.A.T Ring and the 2K Championship Ring. Matches and
 * trophies carry a `ring` discriminator; everything else (standings seed,
 * tournaments) reads both rings combined.
 */
export type Ring = 'goat' | '2k'

export const RING_LABELS: Record<Ring, string> = {
  goat: 'G.O.A.T Ring',
  '2k': '2K Championship Ring',
}

/** Short display names for toggles / badges. */
export const RING_SHORT: Record<Ring, string> = {
  goat: 'G.O.A.T',
  '2k': '2K Championship',
}

/** Rows created before the ring column exist as NULL — treat them as GOAT. */
export const ringOf = (v: unknown): Ring => (v === '2k' ? '2k' : 'goat')

/**
 * Lash's Lakers only compete in the 2K Championship Ring — they never appear
 * in G.O.A.T views (standings, charts, log-match pickers).
 */
export const GOAT_EXCLUDED_SLUGS = ['lakers']
