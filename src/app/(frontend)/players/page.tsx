import { IdentificationCard } from '@phosphor-icons/react/dist/ssr'
import { safeQuery } from '@/lib/payload'
import { toCardPlayer, type CardPlayer } from '@/lib/players'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { PlayersExplorer } from '@/components/players-explorer'

export const dynamic = 'force-dynamic' // never cache a transient DB blip (would be served for the whole revalidate window)
export const metadata = { title: 'Players' }

export default async function PlayersPage() {
  const { data, dbReady } = await safeQuery(
    async (payload) => {
      const res = await payload.find({
        collection: 'players',
        sort: '-ovr',
        limit: 500,
        depth: 1,
      })
      return res.docs.map(toCardPlayer) as CardPlayer[]
    },
    [] as CardPlayer[],
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
        title="Player Pool"
        icon={IdentificationCard}
        subtitle={`${data.length} players · NBA 2K ratings`}
      />
      {data.length > 0 ? (
        <PlayersExplorer players={data} />
      ) : (
        <EmptyState
          icon={IdentificationCard}
          title="No players yet"
          description="Run the seed script to import the 389-player pool from your CSV, or add players in the admin."
        />
      )}
    </div>
  )
}
