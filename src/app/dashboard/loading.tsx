import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background" aria-hidden="true">
      {/* Top bar */}
      <div className="border-b border-border px-4 py-3">
        <Skeleton variant="text" width={120} height={20} />
      </div>
      <div className="p-4 space-y-4 sm:p-6 sm:space-y-6">
        {/* Hero section */}
        <Skeleton variant="rect" height={120} />
        {/* Stats row */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Skeleton variant="rect" height={80} />
          <Skeleton variant="rect" height={80} />
          <Skeleton variant="rect" height={80} />
          <Skeleton variant="rect" height={80} />
        </div>
        {/* Content grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
        <Skeleton variant="rect" height={60} />
      </div>
    </div>
  )
}
