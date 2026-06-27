import Link from 'next/link'
import {
  Gavel,
  ArrowsLeftRight,
  Trophy,
  Users as UsersIcon,
  IdentificationCard,
  Lightning,
  CaretRight,
} from '@phosphor-icons/react/dist/ssr'
import { PlayerCard, type PlayerCardData } from '@/components/player-card'
import { GlassPanel, StatTile } from '@/components/ui-bits'
import { MatchStats, type TeamStat } from '@/components/home/match-stats'

export type DashboardData = {
  season: string
  franchises: number
  players: number
  sold: number
  cards: PlayerCardData[]
  stats: TeamStat[]
}

const QUICK_LINKS = [
  { href: '/trades', label: 'Trade Center', icon: ArrowsLeftRight, desc: 'Propose & manage deals' },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy, desc: 'Brackets & fixtures' },
  { href: '/standings', label: 'Standings', icon: UsersIcon, desc: 'League table & form' },
]

export function DashboardView({ season, franchises, players, sold, cards, stats }: DashboardData) {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <GlassPanel strong className="relative overflow-hidden p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          <Lightning weight="fill" size={13} /> {season} · Live
        </span>
        <h1 className="mt-4 max-w-2xl font-display text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
          The home of our <span className="text-primary">NBA 2K</span> league
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Run the auction live, wheel and deal in the trade center, and battle through tournaments —
          all in one place.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/auction" className="skeuo-btn flex items-center gap-2 rounded-xl px-5 py-3 font-semibold">
            <Gavel weight="bold" size={18} /> Enter Auction Room
          </Link>
          <Link href="/players" className="skeuo flex items-center gap-2 rounded-xl px-5 py-3 font-semibold">
            <IdentificationCard weight="bold" size={18} /> Browse Players
          </Link>
        </div>
      </GlassPanel>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Franchises" value={franchises} icon={UsersIcon} />
        <StatTile label="Player Pool" value={players} icon={IdentificationCard} />
        <StatTile label="Players Sold" value={sold} icon={Gavel} accent />
        <StatTile label="Season" value={season} icon={Trophy} />
      </div>

      {/* Top rated showcase */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-black uppercase tracking-tight">Top Rated</h2>
          <Link
            href="/players"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            View all <CaretRight weight="bold" size={14} />
          </Link>
        </div>
        {cards.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {cards.map((c, i) => (
              <PlayerCard key={i} player={c} size="md" />
            ))}
          </div>
        ) : (
          <GlassPanel className="p-8 text-center text-sm text-muted-foreground">
            Seed the player pool to see the top-rated cards here.
          </GlassPanel>
        )}
      </section>

      {/* League stats from logged matches */}
      <MatchStats stats={stats} />

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {QUICK_LINKS.map(({ href, label, icon: Icon, desc }) => (
          <Link
            key={href}
            href={href}
            className="skeuo flex items-center gap-3 rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon weight="bold" size={20} />
            </span>
            <div className="flex-1">
              <p className="font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <CaretRight weight="bold" size={16} className="text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  )
}
