import { PageSkeleton } from '@/components/ui/skeleton'

/**
 * Global loading state.
 * Shows during server component fetches and route transitions,
 * replacing the blank white screen with a skeleton that matches
 * the content layout.
 */
export default function Loading() {
  return <PageSkeleton />
}
