'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash, CircleNotch } from '@phosphor-icons/react'
import { GlassPanel } from '@/components/ui-bits'
import { deleteMatch, isCommissionerViewer } from '@/app/(frontend)/matches/actions'

export type RecentMatch = {
  id: number
  home: string
  away: string
  homeColor: string | null
  awayColor: string | null
  homeScore: number | null
  awayScore: number | null
  walkover: boolean
  date: string
}

const DOT = '#DF2604'

export function RecentMatches({ matches }: { matches: RecentMatch[] }) {
  const [canDelete, setCanDelete] = React.useState(false)

  // Detected on the client so the home page stays statically cached.
  React.useEffect(() => {
    let active = true
    isCommissionerViewer().then((v) => active && setCanDelete(v))
    return () => {
      active = false
    }
  }, [])

  if (matches.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-black uppercase tracking-tight">Recent results</h2>
      <GlassPanel className="divide-y divide-border/50 overflow-hidden p-0">
        {matches.map((m) => (
          <MatchRow key={m.id} match={m} canDelete={canDelete} />
        ))}
      </GlassPanel>
    </div>
  )
}

function MatchRow({ match: m, canDelete }: { match: RecentMatch; canDelete: boolean }) {
  const router = useRouter()
  const [pending, start] = React.useTransition()

  const homeWon = (m.homeScore ?? 0) > (m.awayScore ?? 0)
  const awayWon = (m.awayScore ?? 0) > (m.homeScore ?? 0)

  const remove = () => {
    if (!confirm(`Delete ${m.home} vs ${m.away}? This can't be undone.`)) return
    start(async () => {
      const res = await deleteMatch(m.id)
      if (res.ok) {
        toast.success('Match deleted')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Delete failed')
      }
    })
  }

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
        {m.walkover && (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
            Walkover
          </span>
        )}
        {m.date && <span className="hidden text-xs text-muted-foreground sm:inline">{m.date}</span>}
        {canDelete && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label={`Delete ${m.home} vs ${m.away}`}
            className="rounded-lg p-1.5 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            {pending ? (
              <CircleNotch weight="bold" className="size-4 animate-spin" />
            ) : (
              <Trash weight="bold" className="size-4" />
            )}
          </button>
        )}
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
      {align === 'left' && (
        <span
          className="inline-block size-2.5 shrink-0 rounded-full"
          style={{ background: color ?? DOT }}
        />
      )}
      <span className={`truncate text-sm font-semibold ${win ? '' : 'text-muted-foreground'}`}>
        {name}
      </span>
      {align === 'right' && (
        <span
          className="inline-block size-2.5 shrink-0 rounded-full"
          style={{ background: color ?? DOT }}
        />
      )}
    </div>
  )
}
