import { getPayloadClient } from '@/lib/payload'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { MatchManager, type ManagedMatch } from './match-manager'

const relName = (v: unknown): string | null =>
  v && typeof v === 'object' && 'name' in v ? ((v as { name?: string }).name ?? null) : null
const relColor = (v: unknown): string | null =>
  v && typeof v === 'object' && 'color' in v ? ((v as { color?: string }).color ?? null) : null

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

export default async function CommishMatchesPage() {
  let matches: ManagedMatch[]
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'matches', limit: 200, depth: 1, sort: '-playedAt' })
    matches = res.docs.map((m) => ({
      id: m.id as number,
      home: relName(m.homeFranchise) ?? '—',
      away: relName(m.awayFranchise) ?? '—',
      homeColor: relColor(m.homeFranchise),
      awayColor: relColor(m.awayFranchise),
      homeScore: m.homeScore ?? null,
      awayScore: m.awayScore ?? null,
      walkover: !!m.walkover,
      status: m.status ?? 'scheduled',
      date: fmtDate(m.playedAt),
    }))
  } catch {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  return <MatchManager matches={matches} />
}
