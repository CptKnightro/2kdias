'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Basketball, Trophy, FlagBanner, CheckCircle } from '@phosphor-icons/react'
import { GlassPanel } from '@/components/ui-bits'
import { TeamLogo } from '@/components/team-logo'
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
              allOptions={franchiseOptions}
              disabledValue={awayFranchise}
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
              allOptions={franchiseOptions}
              disabledValue={homeFranchise}
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
  allOptions,
  disabledValue,
  scoreValue,
  onScoreChange,
}: {
  label: string
  teamValue: string
  onTeamChange: (v: string) => void
  allOptions: Option[]
  /** The team picked in the *other* column — hidden on desktop, dimmed on the strip. */
  disabledValue: string
  scoreValue: string
  onScoreChange: (v: string) => void
}) {
  // Desktop dropdown drops the opponent so the same team can't be picked twice.
  const dropdownOptions = allOptions.filter((o) => o.value !== disabledValue)
  return (
    <div className="min-w-0 space-y-3">
      <div className="block min-w-0 space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {/* Desktop: classic dropdown */}
        <div className="hidden lg:block">
          <Select
            aria-label={label}
            value={teamValue}
            onChange={(e) => onTeamChange(e.target.value)}
            options={dropdownOptions}
            placeholder="— select team —"
          />
        </div>
        {/* Mobile + tablet: swipeable team strip (cooler than a native select) */}
        <TeamStrip
          className="lg:hidden"
          ariaLabel={label}
          options={allOptions}
          value={teamValue}
          disabledValue={disabledValue}
          onChange={onTeamChange}
        />
      </div>
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

/**
 * Horizontal snap-scrolling team picker — one tappable crest per franchise, like
 * a calendar day-strip. Shown on mobile/tablet in place of the dropdown; the
 * opponent's pick stays visible but dimmed so the row never reflows.
 */
function TeamStrip({
  options,
  value,
  disabledValue,
  onChange,
  ariaLabel,
  className,
}: {
  options: Option[]
  value: string
  disabledValue: string
  onChange: (v: string) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {options.map((o) => {
        const selected = value === o.value
        const disabled = disabledValue === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={o.label}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex min-w-[4.75rem] shrink-0 snap-center flex-col items-center gap-1.5 rounded-2xl px-3 py-2.5 transition-all',
              disabled
                ? 'pointer-events-none opacity-30'
                : selected
                  ? 'skeuo-btn ring-2 ring-inset ring-primary'
                  : 'skeuo text-foreground/70 hover:-translate-y-0.5 hover:text-foreground',
            )}
          >
            {selected && (
              <CheckCircle weight="fill" className="absolute right-1 top-1 size-4 text-white" />
            )}
            <TeamLogo name={o.label} color="#DF2604" size={34} />
            <span
              className={cn(
                'max-w-[4.5rem] truncate text-xs font-bold uppercase tracking-tight',
                selected && 'text-white',
              )}
            >
              {o.label}
            </span>
          </button>
        )
      })}
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
