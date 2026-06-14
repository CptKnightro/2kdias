import { getPayloadClient } from '@/lib/payload'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { PlayerManager, type PlayerRow, type AwardRow } from './player-manager'
import type { Option } from '@/components/commissioner/fields'

export default async function CommishPlayersPage() {
  let players: PlayerRow[]
  let franchiseOptions: Option[]
  let playerOptions: Option[]
  let awards: AwardRow[]
  try {
    const payload = await getPayloadClient()
    const [pl, fr, aw] = await Promise.all([
      payload.find({ collection: 'players', limit: 1000, depth: 0, sort: '-ovr' }),
      payload.find({ collection: 'franchises', limit: 200, depth: 0, sort: 'name' }),
      payload.find({ collection: 'awards', limit: 200, depth: 1, sort: '-createdAt' }),
    ])

    players = pl.docs.map((p) => ({
      id: p.id as number,
      name: p.name,
      position: p.position ?? '',
      ovr: p.ovr ?? 0,
      category: p.category ?? '',
      nbaTeam: p.nbaTeam ?? '',
      status: p.status ?? 'available',
      franchise: p.franchise == null ? '' : String(p.franchise),
      basePrice: p.basePrice ?? null,
      soldPrice: p.soldPrice ?? null,
    }))

    franchiseOptions = fr.docs.map((f) => ({ label: f.name, value: String(f.id) }))

    playerOptions = pl.docs.map((p) => ({
      label: `${p.name} (${p.ovr ?? 0})`,
      value: String(p.id),
    }))

    awards = aw.docs.map((a) => ({
      id: a.id as number,
      title: a.title,
      type: a.type ?? '',
      season: a.season ?? '',
      franchiseName:
        a.franchise && typeof a.franchise === 'object' ? a.franchise.name : '',
      playerName: a.player && typeof a.player === 'object' ? a.player.name : '',
      note: a.note ?? '',
    }))
  } catch {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  return (
    <PlayerManager
      players={players}
      franchiseOptions={franchiseOptions}
      playerOptions={playerOptions}
      awards={awards}
    />
  )
}
