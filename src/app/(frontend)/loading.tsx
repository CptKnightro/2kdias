import { PageSkeleton } from '@/components/skeletons'

// Group-level Suspense fallback: shows while any frontend page streams or an
// ISR-cached page regenerates. Individual routes can override with their own
// loading.tsx if a more tailored skeleton is wanted.
export default function Loading() {
  return <PageSkeleton />
}
