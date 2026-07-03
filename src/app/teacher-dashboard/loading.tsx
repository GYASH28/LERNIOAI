import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 space-y-4">
      <Skeleton variant="text" width={200} height={24} />
      <Skeleton variant="rect" height={120} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    </div>
  )
}
