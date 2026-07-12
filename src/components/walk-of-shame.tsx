import { Skull } from '@phosphor-icons/react/dist/ssr'
import { GlassPanel } from '@/components/ui-bits'
import { TeamLogo } from '@/components/team-logo'
import type { ShameRow } from '@/lib/tournament-stats'

/**
 * Walk of Shame — the league's hall of forfeits. A team earns a mark for every
 * walkover-flagged game it lost (league + tournament combined). The team(s) with
 * the most wear the crown. Renders nothing when everyone's record is clean.
 */
export function WalkOfShame({ rows, subtitle }: { rows: ShameRow[]; subtitle?: string }) {
  if (rows.length === 0) return null
  const worst = rows[0].defeats

  return (
    <GlassPanel className="h-full p-5">
      <div className="mb-1 flex items-center gap-2">
        <Skull weight="fill" size={18} className="text-primary" />
        <h3 className="font-display text-lg font-black uppercase tracking-tight">Walk of Shame</h3>
        <span className="ml-auto text-[11px] uppercase tracking-wider text-muted-foreground">
          most walkover defeats
        </span>
      </div>
      {subtitle && <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>}

      <ul className="space-y-1.5">
        {rows.map((r, i) => {
          const crowned = r.defeats === worst
          return (
            <li
              key={r.id}
              className={`flex items-center gap-3 rounded-xl p-2.5 ${
                crowned ? 'skeuo-btn ring-1 ring-primary/50' : 'skeuo-inset'
              }`}
            >
              <span
                className={`w-4 shrink-0 text-center font-display text-sm font-black ${
                  crowned ? 'text-white/80' : 'text-muted-foreground'
                }`}
              >
                {i + 1}
              </span>
              <TeamLogo name={r.team} color={r.color} size={22} className="grayscale-[0.35]" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {r.owner}
                {crowned && (
                  <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Shame champ
                  </span>
                )}
              </span>
              <span
                className={`font-display text-lg font-black tabular-nums ${
                  crowned ? 'text-white' : 'text-primary'
                }`}
              >
                {r.defeats}
              </span>
            </li>
          )
        })}
      </ul>
    </GlassPanel>
  )
}
