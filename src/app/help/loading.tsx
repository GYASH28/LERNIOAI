import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-6 lg:px-8" aria-hidden="true">
      <Skeleton variant="text" width={200} height={28} />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rect" height={80} />
        ))}
      </div>
    </div>
  )
}
