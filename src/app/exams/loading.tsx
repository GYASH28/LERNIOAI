import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6" aria-hidden="true">
      <Skeleton variant="text" width={100} height={24} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="card" />)}
      </div>
    </div>
  )
}
