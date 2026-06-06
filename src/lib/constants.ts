export const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'] as const
export type Position = (typeof POSITIONS)[number]

export const POSITION_LABELS: Record<Position, string> = {
  PG: 'Point Guard',
  SG: 'Shooting Guard',
  SF: 'Small Forward',
  PF: 'Power Forward',
  C: 'Center',
}

// Categories present in the source CSV.
export const PLAYER_CATEGORIES = [
  'All-Time Legend',
  'Current',
  'All-Decade',
  'All-Star',
  'Current + All-Time',
] as const
export type PlayerCategory = (typeof PLAYER_CATEGORIES)[number]

export const PLAYER_STATUSES = ['available', 'sold', 'unsold', 'released'] as const
export type PlayerStatus = (typeof PLAYER_STATUSES)[number]
