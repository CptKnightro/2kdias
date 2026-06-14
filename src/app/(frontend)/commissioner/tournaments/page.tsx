import { getPayloadClient } from '@/lib/payload'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { TournamentManager, type TournamentRow, type MatchRow } from './tournament-manager'
import type { Option } from '@/components/commissioner/fields'

export default async function CommishTournamentsPage() {
  let tournaments: TournamentRow[]
  let franchiseOptions: Option[]
  try {
    const payload = await getPayloadClient()
    const [fr, tr, ma] = await Promise.all([
      payload.find({ collection: 'franchises', limit: 200, depth: 0, sort: 'name' }),
      payload.find({ collection: 'tournaments', limit: 200, depth: 0, sort: 'name' }),
      payload.find({ collection: 'matches', limit: 500, depth: 0, sort: 'playedAt' }),
    ])

    const matchRows: MatchRow[] = ma.docs.map((m) => ({
      id: m.id as number,
      tournament: m.tournament == null ? null : (m.tournament as number),
      round: m.round ?? '',
      status: m.status ?? 'scheduled',
      homeFranchise: m.homeFranchise == null ? '' : String(m.homeFranchise),
      awayFranchise: m.awayFranchise == null ? '' : String(m.awayFranchise),
      homeScore: m.homeScore ?? null,
      awayScore: m.awayScore ?? null,
      playedAt: m.playedAt ?? '',
    }))

    tournaments = tr.docs.map((t) => ({
      id: t.id as number,
      name: t.name,
      format: t.format ?? '',
      status: t.status ?? 'upcoming',
      season: t.season ?? '',
      participants: ((t.participants ?? []) as number[]).map((p) => String(p)),
      description: t.description ?? '',
      champion: t.champion == null ? '' : String(t.champion),
      matches: matchRows.filter((m) => m.tournament === t.id),
    }))

    franchiseOptions = fr.docs.map((f) => ({ label: f.name, value: String(f.id) }))
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
