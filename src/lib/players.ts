import type { PlayerCardData } from '@/components/player-card'
import type { Player } from '@/payload-types'

export type CardPlayer = PlayerCardData & {
  id: string
  status?: string | null
  basePrice?: number | null
  soldPrice?: number | null
}

export function toCardPlayer(p: Player): CardPlayer {
  return {
    id: String(p.id),
    name: p.name,
    ovr: p.ovr,
    position: p.position,
    nbaTeam: p.nbaTeam,
    category: p.category,
    status: p.status,
    basePrice: p.basePrice,
    soldPrice: p.soldPrice,
  }
}
