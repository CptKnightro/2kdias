import { getPayloadClient } from '@/lib/payload'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import type { Option } from '@/components/commissioner/fields'
import { TrophyManager, type ManagedTrophy } from './trophy-manager'

export default async function CommishTrophiesPage() {
  let trophies: ManagedTrophy[]
  let franchiseOptions: Option[]
  try {
    const payload = await getPayloadClient()
    const [trophyRes, franchiseRes] = await Promise.all([
      payload.find({ collection: 'trophies', sort: 'createdAt', limit: 100, depth: 1 }),
      payload.find({ collection: 'franchises', sort: 'name', limit: 100, depth: 0 }),
    ])
    trophies = trophyRes.docs.map((t) => ({
      id: t.id as number,
      name: t.name,
      kind: t.kind === 'final' ? 'final' : 'recurring',
      description: t.description ?? null,
      winners: (t.winners ?? []).map((w, i) => ({
        id: w.id ?? `${t.id}-${i}`,
        name: (typeof w.franchise === 'object' ? w.franchise?.name : null) ?? '—',
        season: w.season ?? null,
      })),
    }))
    franchiseOptions = franchiseRes.docs.map((f) => ({ label: f.name, value: String(f.id) }))
  } catch {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  return <TrophyManager trophies={trophies} franchiseOptions={franchiseOptions} />
}
