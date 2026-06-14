import { revalidatePath } from 'next/cache'
import type { CollectionConfig, GlobalConfig } from 'payload'

/**
 * On-demand cache invalidation for the frontend.
 *
 * Frontend pages are statically cached (ISR) — they never hit the DB on a
 * normal request. When data changes in the admin, Payload `afterChange` /
 * `afterDelete` hooks call `revalidatePath` for exactly the pages that depend
 * on that collection, so the cache refreshes instantly while every other page
 * stays cached. A long `revalidate` on each page is the background safety net.
 *
 * Dynamic routes are revalidated with their pattern + the `'page'` type form,
 * e.g. `{ path: '/teams/[slug]', type: 'page' }`, which purges every instance.
 */
export type RevalTarget = string | { path: string; type: 'page' | 'layout' }

function purge(targets: RevalTarget[]) {
  for (const t of targets) {
    try {
      if (typeof t === 'string') revalidatePath(t)
      else revalidatePath(t.path, t.type)
    } catch {
      // revalidatePath only works inside Next's request/render scope. When the
      // config is loaded outside it (seed scripts, migrations) this is a no-op.
    }
  }
}

/** Attach revalidation hooks to a collection without dropping existing hooks. */
export function withRevalidation(
  collection: CollectionConfig,
  targets: RevalTarget[],
): CollectionConfig {
  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      afterChange: [
        ...(collection.hooks?.afterChange ?? []),
        ({ doc }) => {
          purge(targets)
          return doc
        },
      ],
      afterDelete: [
        ...(collection.hooks?.afterDelete ?? []),
        ({ doc }) => {
          purge(targets)
          return doc
        },
      ],
    },
  }
}

/** Attach a revalidation hook to a global without dropping existing hooks. */
export function withGlobalRevalidation(
  global: GlobalConfig,
  targets: RevalTarget[],
): GlobalConfig {
  return {
    ...global,
    hooks: {
      ...global.hooks,
      afterChange: [
        ...(global.hooks?.afterChange ?? []),
        ({ doc }) => {
          purge(targets)
          return doc
        },
      ],
    },
  }
}
