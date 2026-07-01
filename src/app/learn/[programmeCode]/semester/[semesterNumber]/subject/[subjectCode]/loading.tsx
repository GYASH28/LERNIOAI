import { Skeleton } from '@/components/ui/skeleton'

export default function SubjectLoading() {
  return (
    <div className="min-h-screen bg-background" aria-hidden="true">
      <div className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton variant="text" width={120} height={16} />
          <Skeleton variant="text" width={300} height={32} className="mt-3" />
          <Skeleton variant="text" width={500} height={14} className="mt-2" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-4">
        <Skeleton variant="rect" height={200} />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton variant="rect" height={180} />
          <Skeleton variant="rect" height={180} />
        </div>
      </div>
    </div>
  )
}
