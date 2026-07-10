'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Basketball, Trophy, FlagBanner } from '@phosphor-icons/react'
import { GlassPanel } from '@/components/ui-bits'
import {
  Field,
  Select,
  NumberInput,
  SubmitButton,
  MiniButton,
  type Option,
} from '@/components/commissioner/fields'
import { logMatch } from '@/app/(frontend)/matches/actions'
import { RecentMatches, type RecentMatch } from '@/components/home/recent-matches'
import { cn } from '@/lib/utils'

export function LogMatchView({
  franchiseOptions,
  recent,
}: {
  franchiseOptions: Option[]
  recent: RecentMatch[]
}) {
  const router = useRouter()
  const [homeFranchise, setHomeFranchise] = React.useState('')
  const [awayFranchise, setAwayFranchise] = React.useState('')
  const [homeScore, setHomeScore] = React.useState('')
  const [awayScore, setAwayScore] = React.useState('')
  const [walkover, setWalkover] = React.useState(false)
  const [pending, start] = React.useTransition()

  const reset = () => {
    setHomeFranchise('')
    setAwayFranchise('')
    setHomeScore('')
    setAwayScore('')
    setWalkover(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!homeFranchise || !awayFranchise) return toast.error('Pick both teams')
    if (homeFranchise === awayFranchise) return toast.error('Teams must be different')
    if (homeScore === '' || awayScore === '') return toast.error('Enter both scores')
    start(async () => {
      const res = await logMatch({ homeFranchise, awayFranchise, homeScore, awayScore, walkover })
      if (res.ok) {
        toast.success('Match logged')
        reset()
        router.refresh() // refresh dashboard charts with the new result
      } else {
        toast.error(res.error ?? 'Something went wrong')
      }
    })
  }

  // Each team's dropdown hides the other team so you can't pick the same one twice.
  const homeOptions = React.useMemo(
    () => franchiseOptions.filter((o) => o.value !== awayFranchise),
    [franchiseOptions, awayFranchise],
  )
  const awayOptions = React.useMemo(
    () => franchiseOptions.filter((o) => o.value !== homeFranchise),
    [franchiseOptions, homeFranchise],
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Log a Match
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick the two teams and enter the final score. No login needed — it lands straight in the
          standings and dashboard charts.
        </p>
      </div>

      <GlassPanel strong className="p-6 sm:p-8">
        <form onSubmit={submit} className="space-y-6">
          {/* Walkover toggle — sits at the top of the form */}
          <div className="flex items-center justify-between gap-3 rounded-xl skeuo-inset px-4 py-3">
            <div className="flex items-center gap-2.5">
              <FlagBanner
                weight="fill"
                className={cn('size-5', walkover ? 'text-primary' : 'text-muted-foreground')}
              />
              <div>
                <p className="text-sm font-semibold">Walkover</p>
                <p className="text-xs text-muted-foreground">
                  Just a tag — enter the scores; the loser earns a Walk of Shame mark.
                </p>
              </div>
            </div>
            <Toggle on={walkover} onChange={setWalkover} label="Walkover" />
          </div>

          <div className="grid items-start gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <TeamColumn
              label="Team 1"
              teamValue={homeFranchise}
              onTeamChange={setHomeFranchise}
              teamOptions={homeOptions}
              scoreValue={homeScore}
              onScoreChange={setHomeScore}
            />
            <div className="flex items-center justify-center pt-8 font-display text-2xl font-black text-muted-foreground sm:pt-10">
              vs
            </div>
            <TeamColumn
              label="Team 2"
              teamValue={awayFranchise}
              onTeamChange={setAwayFranchise}
              teamOptions={awayOptions}
              scoreValue={awayScore}
              onScoreChange={setAwayScore}
            />
          </div>

          <div className="flex items-center justify-center gap-2">
            <SubmitButton type="submit" pending={pending} className="px-6 py-2.5">
              <Trophy weight="bold" className="size-4" /> Log match
            </SubmitButton>
            <MiniButton type="button" onClick={reset}>
              Clear
            </MiniButton>
          </div>
        </form>
      </GlassPanel>

      <RecentMatches matches={recent} />
    </div>
  )
}

function TeamColumn({
  label,
  teamValue,
  onTeamChange,
  teamOptions,
  scoreValue,
  onScoreChange,
}: {
  label: string
  teamValue: string
  onTeamChange: (v: string) => void
  teamOptions: Option[]
  scoreValue: string
  onScoreChange: (v: string) => void
}) {
  return (
    <div className="space-y-3">
      <Field label={label}>
        <Select
          value={teamValue}
          onChange={(e) => onTeamChange(e.target.value)}
          options={teamOptions}
          placeholder="— select team —"
        />
      </Field>
      <Field label="Score">
        <div className="relative">
          <Basketball
            weight="fill"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60"
          />
          <NumberInput
            min={0}
            value={scoreValue}
            onChange={(e) => onScoreChange(e.target.value)}
            placeholder="0"
            className="pl-9 text-center text-lg font-bold tabular-nums"
          />
        </div>
      </Field>
    </div>
  )
}

/** Skeuomorphic on/off switch. */
function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label ?? 'Toggle'}
      onClick={() => onChange(!on)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        on ? 'bg-primary' : 'skeuo-inset bg-foreground/15',
      )}
    >
      <span
        className={cn(
          'inline-block size-4 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform',
          on ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}
