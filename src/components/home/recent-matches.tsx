import { GlassPanel } from '@/components/ui-bits'
import { TeamLogo } from '@/components/team-logo'
import type { Ring } from '@/lib/rings'

export type RecentMatch = {
  id: number
  home: string
  away: string
  homeColor: string | null
  awayColor: string | null
  homeScore: number | null
  awayScore: number | null
  walkover: boolean
  ring: Ring
  date: string
}

const DOT = '#DF2604'

/**
 * Read-only recent results under the Log Match form. Editing / deleting
 * results lives in the commissioner console (/commissioner/matches) — owners
 * can only log. The list scrolls inside its panel so a long history doesn't
 * swallow the page on phones.
 */
export function RecentMatches({ matches }: { matches: RecentMatch[] }) {
  if (matches.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-black uppercase tracking-tight">Recent results</h2>
      <GlassPanel className="overflow-hidden p-0">
        <div className="max-h-72 divide-y divide-border/50 overflow-y-auto overscroll-contain sm:max-h-96">
          {matches.map((m) => (
            <MatchRow key={m.id} match={m} />
          ))}
        </div>
      </GlassPanel>
    </div>
  )
}

function MatchRow({ match: m }: { match: RecentMatch }) {
  const homeWon = (m.homeScore ?? 0) > (m.awayScore ?? 0)
  const awayWon = (m.awayScore ?? 0) > (m.homeScore ?? 0)
  const drawn = m.homeScore != null && m.awayScore != null && m.homeScore === m.awayScore

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Side name={m.home} color={m.homeColor} win={homeWon} align="right" />
      <div className="flex shrink-0 items-center gap-2 font-display text-lg font-black tabular-nums">
        <span className={homeWon ? '' : 'text-muted-foreground'}>{m.homeScore ?? '–'}</span>
        <span className="text-xs text-muted-foreground">–</span>
        <span className={awayWon ? '' : 'text-muted-foreground'}>{m.awayScore ?? '–'}</span>
      </div>
      <Side name={m.away} color={m.awayColor} win={awayWon} align="left" />
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span
          className={`hidden rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:inline ${
            m.ring === '2k' ? 'bg-primary/15 text-primary' : 'bg-foreground/10 text-foreground/60'
          }`}
        >
          {m.ring === '2k' ? '2K' : 'G.O.A.T'}
        </span>
        {drawn && (
          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/70">
            Draw
          </span>
        )}
        {m.walkover && (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
            Walkover
          </span>
        )}
        {m.date && <span className="hidden text-xs text-muted-foreground sm:inline">{m.date}</span>}
      </div>
    </div>
  )
}

function Side({
  name,
  color,
  win,
  align,
}: {
  name: string
  color: string | null
  win: boolean
  align: 'left' | 'right'
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${align === 'right' ? 'justify-end text-right' : ''}`}
    >
      {align === 'left' && <TeamLogo name={name} color={color ?? DOT} size={20} />}
      <span className={`truncate text-sm font-semibold ${win ? '' : 'text-muted-foreground'}`}>
        {name}
      </span>
      {align === 'right' && <TeamLogo name={name} color={color ?? DOT} size={20} />}
    </div>
  )
}
