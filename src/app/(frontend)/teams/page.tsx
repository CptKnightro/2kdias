import Link from 'next/link'
import { Users as UsersIcon, IdentificationCard, CurrencyCircleDollar } from '@phosphor-icons/react/dist/ssr'
import { safeQuery, mediaUrl } from '@/lib/payload'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'

export const revalidate = 3600 // cached; purged on-demand via Payload hooks (src/lib/revalidate.ts)
export const metadata = { title: 'Teams' }

export default async function TeamsPage() {
  const { data, dbReady } = await safeQuery(
    async (payload) => {
      const settings = await payload.findGlobal({ slug: 'league-settings' })
      const res = await payload.find({ collection: 'franchises', limit: 50, depth: 1 })
      const teams = await Promise.all(
        res.docs.map(async (f) => {
          const roster = await payload.find({
            collection: 'players',
            where: { franchise: { equals: f.id } },
            sort: '-ovr',
            limit: 100,
          })
          const ovrs = roster.docs.map((p) => p.ovr)
          const teamOvr = ovrs.length
            ? Math.round(ovrs.slice(0, 8).reduce((a, b) => a + b, 0) / Math.min(8, ovrs.length))
            : 0
          return {
            id: String(f.id),
            name: f.name,
            slug: f.slug ?? String(f.id),
            color: f.color ?? '#DF2604',
            logoUrl: mediaUrl(f.logo),
            owner: typeof f.owner === 'object' ? (f.owner?.name ?? null) : null,
            rosterCount: roster.totalDocs,
            teamOvr,
            purseTotal: f.purseTotal ?? 0,
            purseSpent: f.purseSpent ?? 0,
          }
        }),
      )
      return {
        teams,
        sym: settings?.currencySymbol || '$',
        suf: settings?.currencySuffix || 'M',
      }
    },
    { teams: [], sym: '$', suf: 'M' },
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
      <PageHeader title="Franchises" icon={UsersIcon} subtitle="The teams of the league" />
      {data.teams.length > 0 ? (
        <ul className="divide-y divide-border border-y border-border">
          {data.teams.map((t) => (
            <li key={t.id}>
              <Link
                href={`/teams/${t.slug}`}
                className="group flex items-center gap-4 px-2 py-4 transition-colors hover:bg-foreground/5"
              >
                <span
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{ background: t.color }}
                />
                <h3 className="font-display text-xl font-black uppercase leading-tight tracking-tight">
                  {t.name}
                </h3>
                {t.owner && (
                  <span className="text-sm text-muted-foreground">{t.owner}</span>
                )}
                <div className="ml-auto flex items-center gap-5 text-sm text-muted-foreground">
                  <span className="hidden items-center gap-1.5 sm:flex">
                    <IdentificationCard weight="bold" size={14} />
                    {t.rosterCount}
                  </span>
                  <span className="hidden items-center gap-1.5 sm:flex">
                    <CurrencyCircleDollar weight="bold" size={14} />
                    {data.sym}
                    {t.purseTotal - t.purseSpent}
                    {data.suf}
                  </span>
                  <span
                    className="w-8 text-right font-display text-2xl font-black"
                    style={{ color: t.color }}
                  >
                    {t.teamOvr || '—'}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={UsersIcon}
          title="No franchises yet"
          description="Create franchises in the commissioner panel and assign each friend as an owner."
          cta={
            <Link href="/admin/collections/franchises/create" className="skeuo-btn rounded-lg px-4 py-2 font-semibold">
              Create Franchise
            </Link>
          }
        />
      )}
    </div>
  )
}
