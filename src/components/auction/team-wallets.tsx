'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Wallet, FloppyDisk } from '@phosphor-icons/react'
import { GlassPanel } from '@/components/ui-bits'
import { Field, NumberInput, SubmitButton, MiniButton } from '@/components/commissioner/fields'
import { setTeamPurses } from '@/app/(frontend)/auction/actions'

export type WalletTeam = { id: string; name: string; color: string | null; purseTotal: number }

/**
 * Commissioner-only: set each team's wallet (purse) before the auction. Amounts
 * are the total budget; the auction draws each team's remaining purse down as
 * they win players. Starting a Main auction resets spend but keeps these totals.
 */
export function TeamWallets({
  teams,
  currencySymbol,
  currencySuffix,
}: {
  teams: WalletTeam[]
  currencySymbol: string
  currencySuffix: string
}) {
  const router = useRouter()
  const [amounts, setAmounts] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(teams.map((t) => [t.id, String(t.purseTotal)])),
  )
  const [bulk, setBulk] = React.useState('')
  const [pending, start] = React.useTransition()

  if (teams.length === 0) return null

  const setOne = (id: string, v: string) => setAmounts((p) => ({ ...p, [id]: v }))
  const applyAll = () => {
    if (bulk === '') return toast.error('Enter an amount to apply to all teams')
    setAmounts(Object.fromEntries(teams.map((t) => [t.id, bulk])))
  }

  const save = () =>
    start(async () => {
      const payload = teams.map((t) => ({ id: t.id, purseTotal: Number(amounts[t.id] ?? 0) }))
      const res = await setTeamPurses({ teams: payload })
      if (res.ok) {
        toast.success('Team wallets saved')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Failed to save wallets')
      }
    })

  return (
    <GlassPanel className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Wallet weight="bold" size={18} className="text-primary" />
        <h3 className="font-display text-lg font-black uppercase tracking-tight">Team wallets</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Set each team&rsquo;s budget for the auction. Amounts are in{' '}
        <span className="font-semibold text-foreground">
          {currencySymbol || ''}…{currencySuffix || ''}
        </span>
        .
      </p>

      {/* Bulk set */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl skeuo-inset p-3">
        <Field label="Set all to" className="w-40">
          <NumberInput
            min={0}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder="e.g. 100"
            className="tabular-nums"
          />
        </Field>
        <MiniButton type="button" onClick={applyAll}>
          Apply to all
        </MiniButton>
      </div>

      {/* Per-team */}
      <div className="grid gap-3 sm:grid-cols-2">
        {teams.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-xl skeuo-inset p-3">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: t.color || '#DF2604' }}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.name}</span>
            <div className="w-28">
              <NumberInput
                min={0}
                value={amounts[t.id] ?? ''}
                onChange={(e) => setOne(t.id, e.target.value)}
                className="text-right tabular-nums"
              />
            </div>
          </div>
        ))}
      </div>

      <SubmitButton pending={pending} onClick={save}>
        <FloppyDisk weight="bold" className="size-4" /> Save wallets
      </SubmitButton>
    </GlassPanel>
  )
}
