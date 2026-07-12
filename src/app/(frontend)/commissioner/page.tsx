import Link from 'next/link'
import {
  Users as UsersIcon,
  IdentificationCard,
  Trophy,
  ArrowsLeftRight,
  Gavel,
  ListNumbers,
  Medal,
} from '@phosphor-icons/react/dist/ssr'
import { getPayloadClient } from '@/lib/payload'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'

async function getStats() {
  const payload = await getPayloadClient()
  const [franchises, players, sold, tournaments, matches, trades] = await Promise.all([
    payload.count({ collection: 'franchises' }),
    payload.count({ collection: 'players' }),
    payload.count({ collection: 'players', where: { status: { equals: 'sold' } } }),
    payload.count({ collection: 'tournaments' }),
    payload.count({ collection: 'matches' }),
    payload.count({ collection: 'trades' }),
  ])
  return {
    franchises: franchises.totalDocs,
    players: players.totalDocs,
    sold: sold.totalDocs,
    tournaments: tournaments.totalDocs,
    matches: matches.totalDocs,
    trades: trades.totalDocs,
  }
}

export default async function CommissionerDashboard() {
  let stats
  try {
    stats = await getStats()
  } catch {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  const tiles = [
    { label: 'Teams', value: stats.franchises, icon: UsersIcon, href: '/commissioner/teams' },
    { label: 'Players', value: stats.players, icon: IdentificationCard, href: '/commissioner/players' },
    { label: 'Players Sold', value: stats.sold, icon: Gavel, href: '/commissioner/players' },
    { label: 'Tournaments', value: stats.tournaments, icon: Trophy, href: '/commissioner/tournaments' },
    { label: 'Matches', value: stats.matches, icon: ListNumbers, href: '/commissioner/matches' },
    { label: 'Trades', value: stats.trades, icon: ArrowsLeftRight, href: '/commissioner/trades' },
  ]

  const actions = [
    { label: 'Manage Teams', desc: 'Create & edit franchises, owners, purses', icon: UsersIcon, href: '/commissioner/teams' },
    { label: 'Manage Players', desc: 'Ratings, status, assign to teams, awards', icon: IdentificationCard, href: '/commissioner/players' },
    { label: 'Tournaments & Scores', desc: 'Run competitions, enter match results', icon: Trophy, href: '/commissioner/tournaments' },
    { label: 'Fix Match Results', desc: 'Edit scores or delete logged matches', icon: ListNumbers, href: '/commissioner/matches' },
    { label: 'Record a Trade', desc: 'Move players between franchises', icon: ArrowsLeftRight, href: '/commissioner/trades' },
    { label: 'Trophies & Rings', desc: 'Create trophies, crown winners, hand out rings', icon: Medal, href: '/commissioner/trophies' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="skeuo rounded-2xl p-4 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t.label}
              </span>
              <t.icon weight="bold" size={16} className="text-muted-foreground" />
            </div>
            <div className="mt-1 font-display text-3xl font-black">{t.value}</div>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-black uppercase tracking-tight">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="glass group flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-foreground/5"
            >
              <span className="skeuo grid h-12 w-12 shrink-0 place-items-center rounded-xl text-primary">
                <a.icon weight="bold" size={24} />
              </span>
              <div>
                <div className="font-display text-lg font-black uppercase leading-tight tracking-tight">
                  {a.label}
                </div>
                <p className="text-sm text-muted-foreground">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
