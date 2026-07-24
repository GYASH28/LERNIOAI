import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div
      className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8"
      aria-hidden="true"
    >
      <div className="mb-6 flex items-center gap-3">
        <Skeleton variant="circle" width={48} height={48} />
        <div className="space-y-2">
          <Skeleton variant="text" width={180} height={24} />
          <Skeleton variant="text" width={140} height={14} />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} variant="rect" height={64} />
        ))}
      </div>
    </div>
  )
}
