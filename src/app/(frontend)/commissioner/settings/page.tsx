import { getPayloadClient } from '@/lib/payload'
import { getCurrentUser } from '@/lib/auth'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { SettingsManager, type UserRow } from './settings-manager'
import type { Option } from '@/components/commissioner/fields'
import pkg from '../../../../../package.json'

export default async function CommishSettingsPage() {
  let users: UserRow[]
  let franchises: Option[]
  let meId = 0
  try {
    const payload = await getPayloadClient()
    const me = await getCurrentUser()
    meId = (me?.id as number) ?? 0
    const [us, fr] = await Promise.all([
      payload.find({ collection: 'users', limit: 200, depth: 0, sort: 'name' }),
      payload.find({ collection: 'franchises', limit: 200, depth: 0, sort: 'name' }),
    ])
    users = us.docs.map((u) => ({
      id: u.id as number,
      name: u.name,
      email: u.email,
      role: (u.role as 'commissioner' | 'owner') ?? 'owner',
      franchise:
        u.franchise == null ? '' : String(typeof u.franchise === 'object' ? u.franchise.id : u.franchise),
    }))
    franchises = fr.docs.map((f) => ({ label: f.name, value: String(f.id) }))
  } catch {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  return (
    <SettingsManager
      users={users}
      franchises={franchises}
      meId={meId}
      version={pkg.version}
    />
  )
}
