import * as migration_20260627_064829_auction_kinds_retention from './20260627_064829_auction_kinds_retention'

export const migrations = [
  {
    up: migration_20260627_064829_auction_kinds_retention.up,
    down: migration_20260627_064829_auction_kinds_retention.down,
    name: '20260627_064829_auction_kinds_retention',
  },
]
