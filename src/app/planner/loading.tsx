import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8" aria-hidden="true">
      {/* Header row: title + date pill */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" width={180} height={28} />
          <Skeleton variant="text" width={220} height={14} />
        </div>
        <Skeleton variant="rect" width={140} height={32} className="rounded-full" />
      </div>

      {/* Stats row */}
      <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Skeleton variant="rect" height={80} />
        <Skeleton variant="rect" height={80} />
        <Skeleton variant="rect" height={80} />
        <Skeleton variant="rect" height={80} />
      </div>

      {/* Week day strip */}
      <div className="mt-6 grid gap-2 grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} variant="rect" height={64} className="rounded-lg" />
        ))}
      </div>

      {/* Task list */}
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rect" height={56} />
        ))}
      </div>
    </div>
  )
}
