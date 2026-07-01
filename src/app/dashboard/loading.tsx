import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6" aria-hidden="true">
      <Skeleton variant="text" width={180} height={28} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rect" height={100} />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    </div>
  )
}
