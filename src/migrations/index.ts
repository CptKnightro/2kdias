import * as migration_20260627_064829_auction_kinds_retention from './20260627_064829_auction_kinds_retention'
import * as migration_20260627_180000_matches_walkover from './20260627_180000_matches_walkover'
import * as migration_20260627_200000_franchises_owner_name from './20260627_200000_franchises_owner_name'
import * as migration_20260628_010000_trades_expiry from './20260628_010000_trades_expiry'
import * as migration_20260628_020000_trades_loan_window from './20260628_020000_trades_loan_window'

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
  {
    up: migration_20260628_010000_trades_expiry.up,
    down: migration_20260628_010000_trades_expiry.down,
    name: '20260628_010000_trades_expiry',
  },
  {
    up: migration_20260628_020000_trades_loan_window.up,
    down: migration_20260628_020000_trades_loan_window.down,
    name: '20260628_020000_trades_loan_window',
  },
]
