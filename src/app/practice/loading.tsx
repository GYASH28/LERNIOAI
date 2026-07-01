import { Skeleton } from '@/components/ui/skeleton'
export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6" aria-hidden="true">
      <Skeleton variant="text" width={120} height={24} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} variant="card" />)}
      </div>
    </div>
  )
}
