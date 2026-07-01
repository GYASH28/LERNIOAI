import { Skeleton } from '@/components/ui/skeleton'
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" aria-hidden="true">
      <Skeleton variant="text" width={160} height={28} />
      <Skeleton variant="text" width={250} height={14} className="mt-1" />
      <Skeleton variant="rect" height={8} className="mt-4" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    </div>
  )
}
