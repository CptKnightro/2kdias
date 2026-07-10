import {
  Trophy,
  FlagBanner,
  Crown,
  ChartPieSlice,
  UsersThree,
  ListChecks,
  Sword,
} from '@phosphor-icons/react/dist/ssr'
import { GlassPanel, EmptyState } from '@/components/ui-bits'
import { ChartCard } from '@/components/home/chart-card'
import { StandingsTable } from '@/components/home/match-stats'
import { WinShareDonut } from '@/components/home/charts/win-share-donut'
import { buildWinShare, ownerLabel, standingsSort, PRIMARY, type TeamStat } from '@/lib/home-stats'
import type { Series, PairStat } from '@/lib/tournament-stats'
import { cn } from '@/lib/utils'

/**
 * Deep-dive for a single tournament. Built for OG's rotating-2v2 format —
 * best-of-5 series between shifting duos — so it leads with the series board and
 * an individual-player leaderboard rather than fixed-franchise standings. Falls
 * back gracefully for 1v1 tournaments (pairings section just hides).
 */
export function SingleTournamentPanel({
  stats,
  series,
  pairings,
  gameCount,
  bestOf,
  doubles,
}: {
  stats: TeamStat[]
  series: Series[]
  pairings: PairStat[]
  gameCount: number
  bestOf: number
  doubles: boolean
}) {
  if (gameCount === 0) {
    return (
      <EmptyState
        icon={FlagBanner}
        title="No games logged in this tournament yet"
        description="Log the first game inside the tournament to see series, player standings and the win share here."
      />
    )
  }

  const winShare = buildWinShare(stats)
  const done = series.filter((s) => !s.live)
  const leadDuo = pairings[0] ?? null
  const walkovers = series.reduce((n, s) => n + s.games.filter((g) => g.walkover).length, 0)
  const leader = [...stats].sort(standingsSort)[0] ?? null

  return (
    <div className="space-y-5">
      {/* Headline tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={Sword} label="Games" value={gameCount} />
        <Tile
          icon={ListChecks}
          label="Series"
          value={`${done.length}/${series.length}`}
          sub={`Best of ${bestOf}`}
        />
        <Tile
          icon={Crown}
          label={doubles ? 'Top duo' : 'Leader'}
          value={
            doubles
              ? (leadDuo ? `${leadDuo.wins}-${leadDuo.losses}` : '—')
              : (leader ? `${leader.wins}-${leader.losses}` : '—')
          }
          sub={doubles ? (leadDuo?.owners ?? null) : (leader ? ownerLabel(leader) : null)}
        />
        <Tile
          icon={FlagBanner}
          label="Walkovers"
          value={walkovers}
          sub={walkovers ? 'shame marks handed out' : 'none yet'}
        />
      </div>

      {/* Series board — the centrepiece */}
      {series.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Trophy weight="fill" size={16} className="text-warning" />
            <h3 className="font-display text-lg font-black uppercase tracking-tight">Series</h3>
            <span className="ml-auto text-[11px] uppercase tracking-wider text-muted-foreground">
              best of {bestOf} · first to {Math.floor(bestOf / 2) + 1}
            </span>
          </div>
          <div className="space-y-2.5">
            {series.map((s) => (
              <SeriesCard key={s.index} s={s} />
            ))}
          </div>
        </div>
      )}

      {/* Player standings + win share */}
      <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <ListChecks weight="bold" size={16} className="text-primary" />
            <h3 className="font-display text-lg font-black uppercase tracking-tight">
              Player standings
            </h3>
            <span className="ml-auto text-[11px] uppercase tracking-wider text-muted-foreground">
              across all partners
            </span>
          </div>
          <StandingsTable stats={stats} />
        </div>
        <ChartCard title="Win share" icon={ChartPieSlice} hint="by player" fill>
          {winShare.slices.length ? (
            <WinShareDonut slices={winShare.slices} totalWins={winShare.totalWins} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No wins yet.</p>
          )}
        </ChartCard>
      </div>

      {/* Partnerships (doubles only) */}
      {doubles && pairings.length > 0 && <PairingsTable pairings={pairings} />}
    </div>
  )
}

function Tile({
  icon: IconCmp,
  label,
  value,
  sub,
}: {
  icon: typeof Trophy
  label: string
  value: string | number
  sub?: string | null
}) {
  return (
    <GlassPanel className="flex items-center gap-3 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <IconCmp weight="bold" size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase leading-tight tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-display text-2xl font-black leading-none tabular-nums">{value}</p>
        {sub && (
          <p className="mt-0.5 truncate text-[11px] leading-tight text-foreground/70">{sub}</p>
        )}
      </div>
    </GlassPanel>
  )
}

/** One best-of-N series: two pairings, the series score, and a game-by-game strip. */
function SeriesCard({ s }: { s: Series }) {
  return (
    <GlassPanel className="p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="skeuo-inset rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Series {s.index}
        </span>
        {s.live ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Live
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
            <Trophy weight="fill" size={9} /> Decided
          </span>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          {s.games.length} game{s.games.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <PairingSide
          owners={s.aOwners}
          color={s.aColor}
          won={s.winner === 'a'}
          leading={s.live && s.winsA > s.winsB}
          align="right"
        />
        <div className="flex shrink-0 items-center gap-1.5 font-display text-2xl font-black tabular-nums">
          <span className={s.winsA >= s.winsB ? '' : 'text-muted-foreground'}>{s.winsA}</span>
          <span className="text-sm text-muted-foreground">–</span>
          <span className={s.winsB >= s.winsA ? '' : 'text-muted-foreground'}>{s.winsB}</span>
        </div>
        <PairingSide
          owners={s.bOwners}
          color={s.bColor}
          won={s.winner === 'b'}
          leading={s.live && s.winsB > s.winsA}
          align="left"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {s.games.map((g, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-md skeuo-inset px-2 py-1 text-xs font-semibold tabular-nums"
          >
            <span className={g.winner === 'a' ? 'text-foreground' : 'text-muted-foreground'}>
              {g.scoreA}
            </span>
            <span className="text-muted-foreground">–</span>
            <span className={g.winner === 'b' ? 'text-foreground' : 'text-muted-foreground'}>
              {g.scoreB}
            </span>
            {g.walkover && <FlagBanner weight="fill" size={9} className="text-warning" />}
          </span>
        ))}
      </div>
    </GlassPanel>
  )
}

function PairingSide({
  owners,
  color,
  won,
  leading,
  align,
}: {
  owners: string
  color: string
  won: boolean
  leading: boolean
  align: 'left' | 'right'
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2',
        align === 'right' ? 'justify-end text-right' : 'text-left',
      )}
    >
      {align === 'left' && (
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
      )}
      <span
        className={cn(
          'truncate text-sm font-bold',
          won ? 'text-primary' : leading ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {owners}
        {won && <Crown weight="fill" size={12} className="ml-1 inline align-baseline text-warning" />}
      </span>
      {align === 'right' && (
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
      )}
    </div>
  )
}

/** Duo win/loss board — who partners best. */
function PairingsTable({ pairings }: { pairings: PairStat[] }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <UsersThree weight="bold" size={16} className="text-primary" />
        <h3 className="font-display text-lg font-black uppercase tracking-tight">Partnerships</h3>
        <span className="ml-auto text-[11px] uppercase tracking-wider text-muted-foreground">
          who pairs best
        </span>
      </div>
      <GlassPanel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Duo</th>
                <th className="px-2 py-2.5 text-center font-semibold">GP</th>
                <th className="px-2 py-2.5 text-center font-semibold">W</th>
                <th className="px-2 py-2.5 text-center font-semibold">L</th>
                <th className="px-4 py-2.5 text-center font-semibold">Win%</th>
              </tr>
            </thead>
            <tbody>
              {pairings.map((p) => {
                const pct = p.games ? Math.round((p.wins / p.games) * 100) : 0
                return (
                  <tr key={p.key} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block size-2.5 shrink-0 rounded-full"
                          style={{ background: p.color ?? PRIMARY }}
                        />
                        <span className="truncate font-semibold">{p.owners}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-muted-foreground">
                      {p.games}
                    </td>
                    <td className="px-2 py-2.5 text-center font-bold tabular-nums">{p.wins}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-muted-foreground">
                      {p.losses}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold tabular-nums">{pct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  )
}
