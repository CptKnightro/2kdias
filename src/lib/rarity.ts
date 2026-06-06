// Auction base-price helper, scaled by an NBA 2K overall rating.
// (The MyTeam-style rarity tier system was removed.)

/** Suggested auction base price (in league currency) scaled by OVR. */
export function suggestedBasePrice(ovr: number): number {
  if (ovr >= 99) return 50
  if (ovr >= 96) return 40
  if (ovr >= 92) return 30
  if (ovr >= 88) return 20
  if (ovr >= 84) return 12
  if (ovr >= 80) return 8
  if (ovr >= 76) return 5
  return 3
}
