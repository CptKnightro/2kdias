import * as migration_20260627_064829_auction_kinds_retention from './20260627_064829_auction_kinds_retention'
import * as migration_20260627_180000_matches_walkover from './20260627_180000_matches_walkover'
import * as migration_20260627_200000_franchises_owner_name from './20260627_200000_franchises_owner_name'

export const migrations = [
  {
    up: migration_20260627_064829_auction_kinds_retention.up,
    down: migration_20260627_064829_auction_kinds_retention.down,
    name: '20260627_064829_auction_kinds_retention',
  },
  {
    up: migration_20260627_180000_matches_walkover.up,
    down: migration_20260627_180000_matches_walkover.down,
    name: '20260627_180000_matches_walkover',
  },
  {
    up: migration_20260627_200000_franchises_owner_name.up,
    down: migration_20260627_200000_franchises_owner_name.down,
    name: '20260627_200000_franchises_owner_name',
  },
]
