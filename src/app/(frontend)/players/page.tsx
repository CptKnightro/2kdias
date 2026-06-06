import { IdentificationCard } from '@phosphor-icons/react/dist/ssr'
import { safeQuery } from '@/lib/payload'
import { toCardPlayer, type CardPlayer } from '@/lib/players'
import { PageHeader, SetupBanner, EmptyState } from '@/components/ui-bits'
import { PlayersExplorer } from '@/components/players-explorer'

export const dynamic = 'force-dynamic'
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

  return (
    <div>
      <PageHeader
        title="Player Pool"
        icon={IdentificationCard}
        subtitle={`${data.length} players · NBA 2K ratings`}
      />
      {!dbReady && <SetupBanner />}
      {data.length > 0 ? (
        <PlayersExplorer players={data} />
      ) : (
        dbReady && (
          <EmptyState
            icon={IdentificationCard}
            title="No players yet"
            description="Run the seed script to import the 389-player pool from your CSV, or add players in the admin."
          />
        )
      )}
    </div>
  )
}
