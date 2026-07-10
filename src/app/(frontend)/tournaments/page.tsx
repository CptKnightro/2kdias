import Link from 'next/link'
import { Trophy, CaretRight } from '@phosphor-icons/react/dist/ssr'
import { safeQuery } from '@/lib/payload'
import { PageHeader, EmptyState, GlassPanel } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic' // never cache a transient DB blip (would be served for the whole revalidate window)
export const metadata = { title: 'Tournaments' }

export default async function TournamentsPage() {
  const { data, dbReady } = await safeQuery(
    async (payload) => {
      const res = await payload.find({ collection: 'tournaments', sort: '-createdAt', limit: 50, depth: 1 })
      return res.docs.map((t) => ({
        id: String(t.id),
        name: t.name,
        status: t.status ?? 'upcoming',
        season: t.season ?? null,
        // Show the OWNER names of the participating franchises (team as fallback).
        participants: (Array.isArray(t.participants) ? t.participants : [])
          .map((p) => (typeof p === 'object' && p ? p.ownerName || p.name : null))
          .filter(Boolean) as string[],
        champion: typeof t.champion === 'object' ? (t.champion?.name ?? null) : null,
      }))
    },
    [] as {
      id: string
      name: string
      status: string
      season: string | null
      participants: string[]
      champion: string | null
    }[],
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
      <PageHeader
        title="Tournaments"
        icon={Trophy}
        subtitle="Brackets, fixtures & champions"
        action={
          <Link href="/commissioner/tournaments" className="skeuo-btn rounded-lg px-4 py-2 text-sm font-semibold">
            New Tournament
          </Link>
        }
      />
      {data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.id}`}>
              <GlassPanel className="group flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5">
                <span className="skeuo grid h-12 w-12 place-items-center rounded-xl text-warning">
                  <Trophy weight="bold" size={24} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl font-black uppercase tracking-tight">{t.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.participants.length ? t.participants.join(' · ') : 'No owners yet'}
                    {t.champion && ` · 🏆 ${t.champion}`}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                    t.status === 'in-progress'
                      ? 'bg-primary/15 text-primary'
                      : t.status === 'completed'
                        ? 'bg-success/15 text-success'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {t.status}
                </span>
                <CaretRight weight="bold" size={16} className="text-muted-foreground" />
              </GlassPanel>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Trophy}
          title="No tournaments yet"
          description="Spin up a tournament — round robin, knockout, or a full season league — then add fixtures."
          cta={
            <Link href="/commissioner/tournaments" className="skeuo-btn rounded-lg px-4 py-2 font-semibold">
              Create Tournament
            </Link>
          }
        />
      )}
    </div>
  )
}
