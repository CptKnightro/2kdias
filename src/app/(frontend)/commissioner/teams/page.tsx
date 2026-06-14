import { getPayloadClient } from '@/lib/payload'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { TeamManager, type TeamRow } from './team-manager'
import type { Option } from '@/components/commissioner/fields'

export default async function CommishTeamsPage() {
  let teams: TeamRow[]
  let owners: Option[]
  try {
    const payload = await getPayloadClient()
    const [fr, us] = await Promise.all([
      payload.find({ collection: 'franchises', limit: 200, depth: 0, sort: 'name' }),
      payload.find({ collection: 'users', limit: 200, depth: 0 }),
    ])
    teams = fr.docs.map((f) => ({
      id: f.id as number,
      name: f.name,
      slug: f.slug ?? '',
      color: f.color ?? '#DF2604',
      owner: f.owner == null ? '' : String(typeof f.owner === 'object' ? f.owner.id : f.owner),
      purseTotal: f.purseTotal ?? 100,
      purseSpent: f.purseSpent ?? 0,
      established: f.established ?? null,
      bio: f.bio ?? '',
    }))
    owners = us.docs.map((u) => ({
      label: `${u.name}${u.role === 'commissioner' ? ' (commish)' : ''}`,
      value: String(u.id),
    }))
  } catch {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  return <TeamManager teams={teams} owners={owners} />
}
