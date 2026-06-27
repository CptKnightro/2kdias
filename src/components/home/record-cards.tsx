import { Fire, Lightning, Crosshair, Flame } from '@phosphor-icons/react/dist/ssr'
import { GlassPanel } from '@/components/ui-bits'
import type { Records } from '@/lib/home-stats'

type CardSpec = {
  key: string
  icon: typeof Fire
  label: string
  value: string
  sub: string
}

/** Auto-pulled superlatives from the logged matches — the season's highlight reel. */
export function RecordCards({ records }: { records: Records }) {
  const cards: CardSpec[] = []

  if (records.biggestBlowout)
    cards.push({
      key: 'blowout',
      icon: Lightning,
      label: 'Biggest blowout',
      value: `+${records.biggestBlowout.margin}`,
      sub: `${records.biggestBlowout.winner} def. ${records.biggestBlowout.loser} · ${records.biggestBlowout.score}`,
    })

  if (records.closestGame)
    cards.push({
      key: 'closest',
      icon: Crosshair,
      label: 'Closest game',
      value: `${records.closestGame.margin} pt`,
      sub: `${records.closestGame.a} vs ${records.closestGame.b} · ${records.closestGame.score}`,
    })

  if (records.highestScoringMatch)
    cards.push({
      key: 'highest-match',
      icon: Fire,
      label: 'Highest-scoring',
      value: `${records.highestScoringMatch.total}`,
      sub: `${records.highestScoringMatch.a} vs ${records.highestScoringMatch.b} · ${records.highestScoringMatch.score}`,
    })

  if (records.longestStreak)
    cards.push({
      key: 'streak',
      icon: Flame,
      label: 'Longest win streak',
      value: `${records.longestStreak.length}W`,
      sub: `${records.longestStreak.owner} on a tear`,
    })

  if (cards.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight">Record Book</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ key, icon: Icon, label, value, sub }) => (
          <GlassPanel key={key} className="relative overflow-hidden p-4">
            <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-primary/10 blur-2xl" />
            <Icon weight="fill" size={18} className="relative text-primary" />
            <p className="relative mt-2 font-display text-2xl font-black leading-none tabular-nums">{value}</p>
            <p className="relative mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="relative mt-1.5 truncate text-xs text-foreground/70" title={sub}>
              {sub}
            </p>
          </GlassPanel>
        ))}
      </div>
    </section>
  )
}
