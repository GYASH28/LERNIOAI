import { Skeleton } from '@/components/ui/skeleton'

export default function SubjectLoading() {
  return (
    <div className="min-h-screen bg-background" aria-hidden="true">
      {/* Hero */}
      <div className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-6 lg:px-8">
          <Skeleton variant="text" width={100} height={14} />
          <Skeleton variant="text" width={280} height={28} className="mt-3" />
          <Skeleton variant="text" width={400} height={14} className="mt-2" />
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3 sm:min-w-[320px]">
            <Skeleton variant="rect" height={60} />
            <Skeleton variant="rect" height={60} />
            <Skeleton variant="rect" height={60} />
          </div>
        </div>
      </div>
      {/* Coverage focus */}
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-6 lg:px-8">
        <Skeleton variant="rect" height={80} />
      </div>
      {/* Video cards (matching the 2-col grid) */}
      <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <Skeleton variant="text" width={150} height={20} className="mb-4" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border overflow-hidden">
            <Skeleton variant="rect" height={200} />
            <div className="p-4 space-y-2">
              <Skeleton variant="text" width={200} height={14} />
              <Skeleton variant="text" width={150} height={12} />
            </div>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <Skeleton variant="rect" height={200} />
            <div className="p-4 space-y-2">
              <Skeleton variant="text" width={180} height={14} />
              <Skeleton variant="text" width={120} height={12} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
