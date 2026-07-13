import { Trophy } from '@phosphor-icons/react/dist/ssr'
import { safeQuery } from '@/lib/payload'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { TrophyContainer, type TrophyCard } from './trophy-container'

export const dynamic = 'force-dynamic' // never cache a transient DB blip (would be served for the whole revalidate window)
export const metadata = { title: 'Trophies' }

export default async function TrophiesPage() {
  const { data, dbReady } = await safeQuery(
    async (payload) => {
      const res = await payload.find({ collection: 'trophies', sort: 'createdAt', limit: 100, depth: 1 })
      const trophies: TrophyCard[] = res.docs.map((t) => ({
        id: String(t.id),
        name: t.name,
        kind: t.kind === 'final' ? 'final' : 'recurring',
        icon: t.icon ?? null,
        description: t.description ?? null,
        winners: (t.winners ?? []).map((w, i) => {
          const isOwner = w.winnerType === 'owner'
          const franchise = typeof w.franchise === 'object' ? w.franchise : null
          return {
            id: w.id ?? `${t.id}-${i}`,
            winnerKind: isOwner ? ('owner' as const) : ('team' as const),
            name: (isOwner ? w.ownerName : franchise?.name) ?? '—',
            owner: isOwner ? null : (franchise?.ownerName ?? null),
            color: isOwner ? null : (franchise?.color ?? null),
            season: w.season ?? null,
            awardedAt: w.awardedAt ?? null,
          }
        }),
      }))
      return { trophies }
    },
    { trophies: [] as TrophyCard[] },
  )

  if (!dbReady) {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  return (
    <div>
      <PageHeader title="Trophies" icon={Trophy} subtitle="Rings, silverware & bragging rights" />

      {data.trophies.length ? (
        <div className="grid gap-6 md:grid-cols-2">
          {data.trophies.map((t) => (
            <TrophyContainer key={t.id} trophy={t} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Trophy}
          title="The trophy cabinet is empty"
          description="Once the commissioner creates trophies and hands out rings, they'll be immortalised here."
        />
      )}
    </div>
  )
}
