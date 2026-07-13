import { Skeleton } from '@/components/ui/skeleton'
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 lg:px-8" aria-hidden="true">
      <Skeleton variant="text" width={120} height={28} />
      <Skeleton variant="text" width={250} height={14} className="mt-1" />
      <Skeleton variant="rect" height={40} className="mt-6" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rect" height={60} />
        ))}
      </div>
    </div>
  )
}
