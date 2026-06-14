import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Users as UsersIcon, CurrencyCircleDollar, IdentificationCard } from '@phosphor-icons/react/dist/ssr'
import { getPayloadClient, mediaUrl } from '@/lib/payload'
import { toCardPlayer } from '@/lib/players'
import { PageHeader, GlassPanel, StatTile, EmptyState } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { PlayerCard } from '@/components/player-card'

export const revalidate = 3600 // cached; purged on-demand via Payload hooks (src/lib/revalidate.ts)

// Prerender every team page at build so they're static + ISR-cached. New teams
// still render on-demand (dynamicParams defaults to true) and then cache.
export async function generateStaticParams() {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'franchises', limit: 100, depth: 0 })
    return res.docs.map((f) => ({ slug: String(f.slug) }))
  } catch {
    return []
  }
}

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let payload
  try {
    payload = await getPayloadClient()
  } catch {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  const res = await payload.find({
    collection: 'franchises',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
  })
  const f = res.docs[0]
  if (!f) notFound()

  const settings = await payload.findGlobal({ slug: 'league-settings' })
  const sym = settings?.currencySymbol || '$'
  const suf = settings?.currencySuffix || 'M'
  const money = (n: number) => `${sym}${n}${suf}`

  const roster = await payload.find({
    collection: 'players',
    where: { franchise: { equals: f.id } },
    sort: '-ovr',
    limit: 100,
    depth: 1,
  })
  const cards = roster.docs.map(toCardPlayer)
  const ovrs = cards.map((c) => c.ovr)
  const teamOvr = ovrs.length
    ? Math.round(ovrs.slice(0, 8).reduce((a, b) => a + b, 0) / Math.min(8, ovrs.length))
    : 0
  const color = f.color ?? '#DF2604'

  return (
    <div>
      <PageHeader
        title={f.name}
        icon={UsersIcon}
        subtitle={typeof f.owner === 'object' ? `Owner · ${f.owner?.name ?? '—'}` : undefined}
      />

      <GlassPanel strong className="relative mb-6 overflow-hidden p-6">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-25 blur-3xl"
          style={{ background: color }}
        />
        <div className="flex flex-wrap items-center gap-5">
          <span
            className="skeuo grid h-20 w-20 place-items-center overflow-hidden rounded-2xl"
            style={{ color }}
          >
            {mediaUrl(f.logo) ? (
              <Image src={mediaUrl(f.logo)!} alt={f.name} width={80} height={80} className="object-cover" />
            ) : (
              <UsersIcon weight="bold" size={36} />
            )}
          </span>
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Team OVR" value={teamOvr || '—'} icon={UsersIcon} accent />
            <StatTile label="Roster" value={roster.totalDocs} icon={IdentificationCard} />
            <StatTile label="Purse Left" value={money((f.purseTotal ?? 0) - (f.purseSpent ?? 0))} icon={CurrencyCircleDollar} />
            <StatTile label="Spent" value={money(f.purseSpent ?? 0)} icon={CurrencyCircleDollar} />
          </div>
        </div>
        {f.bio && <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{f.bio}</p>}
      </GlassPanel>

      <h2 className="mb-4 font-display text-2xl font-black uppercase tracking-tight">Roster</h2>
      {cards.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {cards.map((c) => (
            <PlayerCard key={c.id} player={c} size="sm" />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={IdentificationCard}
          title="No players yet"
          description="This team will fill up as they win players in the auction or via trades."
        />
      )}
    </div>
  )
}
