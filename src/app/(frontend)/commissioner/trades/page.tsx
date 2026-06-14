import { getPayloadClient } from '@/lib/payload'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { TradeManager, type TradeRow, type PlayerLite } from './trade-manager'
import type { Option } from '@/components/commissioner/fields'

const fid = (v: unknown): string =>
  v == null ? '' : String(typeof v === 'object' ? (v as { id: number }).id : v)

const fname = (v: unknown): string =>
  v == null ? '' : typeof v === 'object' ? ((v as { name?: string }).name ?? '') : String(v)

export default async function CommishTradesPage() {
  let franchiseOptions: Option[]
  let players: PlayerLite[]
  let trades: TradeRow[]
  try {
    const payload = await getPayloadClient()
    const [fr, pl, tr] = await Promise.all([
      payload.find({ collection: 'franchises', limit: 200, depth: 0, sort: 'name' }),
      payload.find({ collection: 'players', limit: 500, depth: 0, sort: 'name' }),
      payload.find({ collection: 'trades', limit: 200, depth: 1, sort: '-createdAt' }),
    ])

    franchiseOptions = fr.docs.map((f) => ({ label: f.name, value: String(f.id) }))

    players = pl.docs.map((p) => ({
      id: String(p.id),
      name: p.name,
      ovr: p.ovr ?? 0,
      franchise: fid(p.franchise),
    }))

    trades = tr.docs.map((t) => ({
      id: t.id as number,
      fromName: fname(t.fromFranchise) || 'Unknown',
      toName: fname(t.toFranchise) || 'Unknown',
      status: t.status ?? 'proposed',
      offeredPlayerNames: (t.offeredPlayers ?? []).map((p) => fname(p)).filter(Boolean),
      requestedPlayerNames: (t.requestedPlayers ?? []).map((p) => fname(p)).filter(Boolean),
      cashAdjustment: t.cashAdjustment ?? 0,
      note: t.note ?? '',
      createdAt: t.createdAt,
    }))
  } catch {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  return <TradeManager franchiseOptions={franchiseOptions} players={players} trades={trades} />
}
