import { Skeleton } from '@/components/ui/skeleton'

export default function LessonLoading() {
  return (
    <div className="min-h-screen bg-background" aria-hidden="true">
      <div className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Skeleton variant="text" width={200} height={14} />
          <Skeleton variant="text" width={400} height={28} className="mt-3" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Skeleton variant="rect" height={300} />
            <Skeleton variant="rect" height={120} />
            <Skeleton variant="rect" height={200} />
          </div>
          <div className="space-y-4">
            <Skeleton variant="rect" height={150} />
            <Skeleton variant="rect" height={100} />
          </div>
        </div>
      </div>
    </div>
  )
}
