import Link from 'next/link'
import {
  Gavel,
  ArrowsLeftRight,
  Trophy,
  Users as UsersIcon,
  IdentificationCard,
  CaretRight,
} from '@phosphor-icons/react/dist/ssr'
import { StatTile } from '@/components/ui-bits'
import { MatchStats, type TeamStat } from '@/components/home/match-stats'

export type DashboardData = {
  season: string
  franchises: number
  players: number
  sold: number
  stats: TeamStat[]
}

const QUICK_LINKS = [
  { href: '/trades', label: 'Trade Center', icon: ArrowsLeftRight, desc: 'Propose & manage deals' },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy, desc: 'Brackets & fixtures' },
  { href: '/standings', label: 'Standings', icon: UsersIcon, desc: 'League table & form' },
]

export function DashboardView({ season, franchises, players, sold, stats }: DashboardData) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Franchises" value={franchises} icon={UsersIcon} />
        <StatTile label="Player Pool" value={players} icon={IdentificationCard} />
        <StatTile label="Players Sold" value={sold} icon={Gavel} accent />
        <StatTile label="Season" value={season} icon={Trophy} />
      </div>

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
