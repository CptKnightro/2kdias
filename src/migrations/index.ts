import * as migration_20260627_064829_auction_kinds_retention from './20260627_064829_auction_kinds_retention';
import * as migration_20260627_180000_matches_walkover from './20260627_180000_matches_walkover';
import * as migration_20260627_200000_franchises_owner_name from './20260627_200000_franchises_owner_name';
import * as migration_20260628_010000_trades_expiry from './20260628_010000_trades_expiry';
import * as migration_20260628_020000_trades_loan_window from './20260628_020000_trades_loan_window';
import * as migration_20260712_150000_trophies from './20260712_150000_trophies';
import * as migration_20260713_100000_trophy_winner_logs from './20260713_100000_trophy_winner_logs';
import * as migration_20260713_110000_trophy_winner_type from './20260713_110000_trophy_winner_type';
import * as migration_20260713_121220_match_trophy_ring from './20260713_121220_match_trophy_ring';

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
  {
    up: migration_20260712_150000_trophies.up,
    down: migration_20260712_150000_trophies.down,
    name: '20260712_150000_trophies',
  },
  {
    up: migration_20260713_100000_trophy_winner_logs.up,
    down: migration_20260713_100000_trophy_winner_logs.down,
    name: '20260713_100000_trophy_winner_logs',
  },
  {
    up: migration_20260713_110000_trophy_winner_type.up,
    down: migration_20260713_110000_trophy_winner_type.down,
    name: '20260713_110000_trophy_winner_type',
  },
  {
    up: migration_20260713_121220_match_trophy_ring.up,
    down: migration_20260713_121220_match_trophy_ring.down,
    name: '20260713_121220_match_trophy_ring'
  },
];
