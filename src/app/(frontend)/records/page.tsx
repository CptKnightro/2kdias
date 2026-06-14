import { Medal, Trophy } from '@phosphor-icons/react/dist/ssr'
import { safeQuery } from '@/lib/payload'
import { PageHeader, EmptyState, GlassPanel } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'

export const revalidate = 3600 // cached; purged on-demand via Payload hooks (src/lib/revalidate.ts)
export const metadata = { title: 'Records & Hall of Fame' }

export default async function RecordsPage() {
  const { data, dbReady } = await safeQuery(
    async (payload) => {
      const [awards, champs] = await Promise.all([
        payload.find({ collection: 'awards', sort: '-createdAt', limit: 100, depth: 1 }),
        payload.find({
          collection: 'tournaments',
          where: { status: { equals: 'completed' } },
          sort: '-createdAt',
          limit: 50,
          depth: 1,
        }),
      ])
      return {
        awards: awards.docs.map((a) => ({
          id: String(a.id),
          title: a.title,
          type: a.type ?? 'other',
          season: a.season ?? null,
          who:
            (typeof a.franchise === 'object' ? a.franchise?.name : null) ??
            (typeof a.player === 'object' ? a.player?.name : null) ??
            '—',
        })),
        champions: champs.docs
          .filter((t) => typeof t.champion === 'object' && t.champion)
          .map((t) => ({
            id: String(t.id),
            name: t.name,
            season: t.season ?? null,
            champion: typeof t.champion === 'object' ? (t.champion?.name ?? '—') : '—',
          })),
      }
    },
    { awards: [], champions: [] as { id: string; name: string; season: string | null; champion: string }[] },
  )

  if (!dbReady) {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  const empty = data.awards.length === 0 && data.champions.length === 0

  return (
    <div>
      <PageHeader title="Hall of Fame" icon={Medal} subtitle="Champions, awards & records" />

      {!empty ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black uppercase tracking-tight">
              <Trophy weight="bold" className="text-warning" /> Champions
            </h2>
            {data.champions.length ? (
              <div className="space-y-2">
                {data.champions.map((c) => (
                  <GlassPanel key={c.id} className="flex items-center gap-3 p-4">
                    <Trophy weight="fill" size={24} className="text-warning" />
                    <div>
                      <p className="font-display text-lg font-bold">{c.champion}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.name}
                        {c.season ? ` · ${c.season}` : ''}
                      </p>
                    </div>
                  </GlassPanel>
                ))}
              </div>
            ) : (
              <GlassPanel className="p-6 text-center text-sm text-muted-foreground">
                No champions crowned yet.
              </GlassPanel>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black uppercase tracking-tight">
              <Medal weight="bold" className="text-primary" /> Awards
            </h2>
            {data.awards.length ? (
              <div className="space-y-2">
                {data.awards.map((a) => (
                  <GlassPanel key={a.id} className="flex items-center gap-3 p-4">
                    <Medal weight="fill" size={22} className="text-primary" />
                    <div className="flex-1">
                      <p className="font-semibold">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.who}
                        {a.season ? ` · ${a.season}` : ''}
                      </p>
                    </div>
                    <span className="rounded-full bg-foreground/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {a.type}
                    </span>
                  </GlassPanel>
                ))}
              </div>
            ) : (
              <GlassPanel className="p-6 text-center text-sm text-muted-foreground">
                No awards handed out yet.
              </GlassPanel>
            )}
          </section>
        </div>
      ) : (
        <EmptyState
          icon={Medal}
          title="The trophy cabinet is empty"
          description="As you complete tournaments and hand out awards, they'll be immortalised here."
        />
      )}
    </div>
  )
}
