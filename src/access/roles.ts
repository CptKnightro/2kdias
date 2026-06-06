import type { Access, FieldAccess } from 'payload'
import type { User } from '@/payload-types'

export type Role = 'commissioner' | 'owner'

export const isCommissioner = (user?: User | null): boolean =>
  user?.role === 'commissioner'

/** Collection-level: any authenticated user. */
export const authenticated: Access = ({ req: { user } }) => Boolean(user)

/** Collection-level: commissioners only. */
export const commissionerOnly: Access = ({ req: { user } }) =>
  isCommissioner(user)

/** Anyone (public) can read; used for public-facing collections. */
export const publicRead: Access = () => true

/** Field-level: only commissioners may edit. */
export const commissionerFieldOnly: FieldAccess = ({ req: { user } }) =>
  isCommissioner(user)

/**
 * Owners can only mutate rows tied to their own franchise; commissioners can
 * touch anything. `franchiseField` is the field on the doc holding the owner's
 * franchise relation.
 */
export const ownFranchiseOrCommissioner =
  (franchiseField = 'franchise'): Access =>
  ({ req: { user } }) => {
    if (!user) return false
    if (isCommissioner(user)) return true
    const franchiseId =
      typeof user.franchise === 'object' ? user.franchise?.id : user.franchise
    if (!franchiseId) return false
    return { [franchiseField]: { equals: franchiseId } }
  }
