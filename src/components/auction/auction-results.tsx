import { Trophy, Prohibit, CheckCircle } from '@phosphor-icons/react/dist/ssr'
import { GlassPanel } from '@/components/ui-bits'
import { formatCurrency } from '@/lib/utils'
import type { HistoryPlayer } from '@/components/auction-room'

type TeamResult = {
  name: string
  color?: string | null
  players: { id: string; name: string; ovr: number; price: number }[]
  total: number
}

/**
 * Post-auction recap shown on /auction once an auction has ended: who landed
 * where, for how much, plus the players that went unsold. Pure presentational —
 * derived entirely from the resolved-lot history.
 */
export function AuctionResults({
  title,
  history,
  currencySymbol = '$',
  currencySuffix = 'M',
}: {
  title: string
  history: HistoryPlayer[]
  currencySymbol?: string
  currencySuffix?: string
}) {
  const money = (n: number) => formatCurrency(n, currencySymbol, currencySuffix)

  const teams = new Map<string, TeamResult>()
  const unsold: HistoryPlayer[] = []
  for (const h of history) {
    if (h.result === 'sold') {
      const key = h.franchiseName ?? 'Unassigned'
      const t = teams.get(key) ?? { name: key, color: h.color, players: [], total: 0 }
      t.players.push({ id: h.id, name: h.name, ovr: h.ovr, price: h.price ?? 0 })
      t.total += h.price ?? 0
      teams.set(key, t)
    } else {
      unsold.push(h)
    }
  }

  const teamList = [...teams.values()].sort((a, b) => b.total - a.total)
  const soldCount = history.length - unsold.length

  return (
    <div className="space-y-5">
      <GlassPanel strong className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-success">
            <CheckCircle weight="fill" size={13} /> Auction complete
          </span>
          <h2 className="mt-3 font-display text-2xl font-black uppercase tracking-tight">{title}</h2>
        </div>
        <div className="flex gap-5">
          <Stat label="Players sold" value={soldCount} />
          <Stat label="Passed" value={unsold.length} />
          <Stat label="Teams" value={teamList.length} />
        </div>
      </GlassPanel>

      {teamList.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teamList.map((t) => (
            <GlassPanel key={t.name} className="p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-display text-lg font-black uppercase tracking-tight">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: t.color || '#DF2604' }}
                  />
                  {t.name}
                </span>
                <span className="font-display text-sm font-bold text-success">{money(t.total)}</span>
              </div>
              <ul className="space-y-1.5">
                {t.players
                  .sort((a, b) => b.price - a.price)
                  .map((p) => (
                    <li
                      key={p.id}
                      className="skeuo-inset flex items-center gap-2.5 rounded-lg p-2"
                    >
                      <span className="font-display text-base font-black text-primary">{p.ovr}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                      <span className="font-display text-sm font-bold">{money(p.price)}</span>
                    </li>
                  ))}
              </ul>
              <p className="mt-2 px-1 text-[11px] text-muted-foreground">
                {t.players.length} player{t.players.length === 1 ? '' : 's'} won
              </p>
            </GlassPanel>
          ))}
        </div>
      )}

      {unsold.length > 0 && (
        <GlassPanel className="p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Prohibit weight="bold" size={15} /> Passed · {unsold.length}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unsold.map((p) => (
              <span
                key={p.id}
                className="skeuo-inset rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground"
              >
                {p.name} · {p.ovr}
              </span>
            ))}
          </div>
        </GlassPanel>
      )}

      {teamList.length === 0 && unsold.length === 0 && (
        <GlassPanel className="flex flex-col items-center gap-2 p-10 text-center">
          <Trophy weight="bold" size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No lots were resolved in this auction.</p>
        </GlassPanel>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="font-display text-2xl font-black text-primary">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
