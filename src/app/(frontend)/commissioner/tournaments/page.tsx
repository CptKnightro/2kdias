import { getPayloadClient } from '@/lib/payload'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { TournamentManager, type TournamentRow } from './tournament-manager'
import type { Option } from '@/components/commissioner/fields'

export default async function CommishTournamentsPage() {
  let tournaments: TournamentRow[]
  let franchiseOptions: Option[]
  try {
    const payload = await getPayloadClient()
    const [fr, tr] = await Promise.all([
      payload.find({ collection: 'franchises', limit: 200, depth: 0, sort: 'name' }),
      payload.find({ collection: 'tournaments', limit: 200, depth: 0, sort: 'name' }),
    ])

    tournaments = tr.docs.map((t) => ({
      id: t.id as number,
      name: t.name,
      format: t.format ?? '',
      status: t.status ?? 'upcoming',
      season: t.season ?? '',
      participants: ((t.participants ?? []) as number[]).map((p) => String(p)),
      description: t.description ?? '',
      champion: t.champion == null ? '' : String(t.champion),
    }))

    // Participants are picked by OWNER name (team name as fallback).
    franchiseOptions = fr.docs.map((f) => ({ label: f.ownerName || f.name, value: String(f.id) }))
  } catch {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  return <TournamentManager tournaments={tournaments} franchiseOptions={franchiseOptions} />
}
