import { Crown, Medal, Trophy } from '@phosphor-icons/react/dist/ssr'
import { safeQuery } from '@/lib/payload'
import { PageHeader, EmptyState, GlassPanel } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'

export const dynamic = 'force-dynamic' // never cache a transient DB blip (would be served for the whole revalidate window)
export const metadata = { title: 'Trophies' }

type WinnerRow = { id: string; name: string; color: string | null; season: string | null }
type TrophyCard = {
  id: string
  name: string
  kind: 'recurring' | 'final'
  description: string | null
  winners: WinnerRow[]
}

export default async function TrophiesPage() {
  const { data, dbReady } = await safeQuery(
    async (payload) => {
      const res = await payload.find({ collection: 'trophies', sort: 'createdAt', limit: 100, depth: 1 })
      const trophies: TrophyCard[] = res.docs.map((t) => ({
        id: String(t.id),
        name: t.name,
        kind: t.kind === 'final' ? 'final' : 'recurring',
        description: t.description ?? null,
        winners: (t.winners ?? []).map((w, i) => ({
          id: w.id ?? `${t.id}-${i}`,
          name: (typeof w.franchise === 'object' ? w.franchise?.name : null) ?? '—',
          color: (typeof w.franchise === 'object' ? w.franchise?.color : null) ?? null,
          season: w.season ?? null,
        })),
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

function TrophyContainer({ trophy }: { trophy: TrophyCard }) {
  const isFinal = trophy.kind === 'final'
  const Icon = isFinal ? Crown : Trophy

  return (
    <GlassPanel className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="skeuo grid h-11 w-11 shrink-0 place-items-center rounded-xl text-warning">
          <Icon weight="fill" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-xl font-black uppercase tracking-tight">
            {trophy.name}
          </h2>
          {trophy.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{trophy.description}</p>
          )}
        </div>
        <span
          className={
            isFinal
              ? 'rounded-full bg-warning/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-warning'
              : 'rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary'
          }
        >
          {isFinal ? 'Final' : 'Recurring'}
        </span>
      </div>

      <div className="mt-4">
        {isFinal ? (
          trophy.winners.length ? (
            <div className="skeuo-inset flex items-center gap-3 rounded-xl p-4">
              <Crown weight="fill" size={28} className="shrink-0 text-warning" />
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-black uppercase leading-tight tracking-tight">
                  {trophy.winners[0].name}
                </p>
                {trophy.winners[0].season && (
                  <p className="text-xs text-muted-foreground">{trophy.winners[0].season}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="skeuo-inset rounded-xl p-4 text-center text-sm text-muted-foreground">
              Not yet awarded.
            </p>
          )
        ) : trophy.winners.length ? (
          <ul className="space-y-1.5">
            {trophy.winners.map((w) => (
              <li key={w.id} className="skeuo-inset flex items-center gap-3 rounded-xl px-3 py-2.5">
                <Medal weight="fill" size={18} className="shrink-0 text-warning" />
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: w.color ?? 'var(--color-muted-foreground)' }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{w.name}</span>
                {w.season && (
                  <span className="shrink-0 text-xs text-muted-foreground">{w.season}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="skeuo-inset rounded-xl p-4 text-center text-sm text-muted-foreground">
            No rings handed out yet.
          </p>
        )}
        {!isFinal && trophy.winners.length > 0 && (
          <p className="mt-2 text-right text-xs text-muted-foreground">
            {trophy.winners.length} ring{trophy.winners.length === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </GlassPanel>
  )
}
