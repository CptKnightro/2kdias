import { notFound } from 'next/navigation'
import { Trophy } from '@phosphor-icons/react/dist/ssr'
import { getPayloadClient } from '@/lib/payload'
import { PageHeader, GlassPanel, EmptyState } from '@/components/ui-bits'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let payload
  try {
    payload = await getPayloadClient()
  } catch {
    notFound()
  }

  let t
  try {
    t = await payload.findByID({ collection: 'tournaments', id, depth: 1 })
  } catch {
    notFound()
  }
  if (!t) notFound()

  const matches = await payload.find({
    collection: 'matches',
    where: { tournament: { equals: id } },
    sort: 'playedAt',
    limit: 200,
    depth: 1,
  })

  const participants = Array.isArray(t.participants)
    ? t.participants.map((p) => (typeof p === 'object' ? p?.name : '—'))
    : []

  return (
    <div>
      <PageHeader
        title={t.name}
        icon={Trophy}
        subtitle={t.champion && typeof t.champion === 'object' ? `Champion · ${t.champion.name}` : t.season ?? undefined}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div>
          <h2 className="mb-3 font-display text-xl font-black uppercase tracking-tight">Fixtures</h2>
          {matches.docs.length > 0 ? (
            <div className="space-y-2">
              {matches.docs.map((m) => {
                const home = typeof m.homeFranchise === 'object' ? m.homeFranchise?.name : '—'
                const away = typeof m.awayFranchise === 'object' ? m.awayFranchise?.name : '—'
                const final = m.status === 'final'
                const homeWin = final && (m.homeScore ?? 0) >= (m.awayScore ?? 0)
                return (
                  <GlassPanel key={m.id} className="flex items-center gap-3 px-4 py-3">
                    {m.round && (
                      <span className="hidden w-24 shrink-0 text-xs uppercase text-muted-foreground sm:block">
                        {m.round}
                      </span>
                    )}
                    <span className={cn('flex-1 text-right font-semibold', homeWin && 'text-primary')}>
                      {home}
                    </span>
                    <span className="skeuo-inset rounded-lg px-3 py-1 font-display font-bold">
                      {final ? `${m.homeScore ?? 0} – ${m.awayScore ?? 0}` : 'vs'}
                    </span>
                    <span className={cn('flex-1 font-semibold', final && !homeWin && 'text-primary')}>
                      {away}
                    </span>
                  </GlassPanel>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Trophy}
              title="No fixtures yet"
              description="Add matches to this tournament in the admin panel."
            />
          )}
        </div>

        <aside>
          <h2 className="mb-3 font-display text-xl font-black uppercase tracking-tight">Teams</h2>
          <GlassPanel className="p-4">
            {participants.length ? (
              <ul className="space-y-1.5">
                {participants.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-display text-xs text-muted-foreground">{i + 1}</span>
                    {p}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No participants added.</p>
            )}
          </GlassPanel>
        </aside>
      </div>
    </div>
  )
}
