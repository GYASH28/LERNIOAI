import { Skeleton } from '@/components/ui/skeleton'

export default function LessonLoading() {
  return (
    <div className="min-h-screen bg-background" aria-hidden="true">
      {/* Breadcrumbs */}
      <div className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Skeleton variant="text" width={180} height={14} />
          <Skeleton variant="text" width={300} height={24} className="mt-3" />
        </div>
      </div>
      {/* Main content + sidebar grid */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Left: video player + content */}
          <div className="space-y-4">
            {/* Video player */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Skeleton variant="rect" height={250} />
              <div className="p-4 space-y-2">
                <Skeleton variant="text" width={250} height={14} />
                <Skeleton variant="text" width={180} height={12} />
              </div>
            </div>
            {/* Lesson overview */}
            <Skeleton variant="rect" height={150} />
            {/* Key concepts */}
            <Skeleton variant="rect" height={200} />
          </div>
          {/* Right: sidebar */}
          <div className="space-y-4">
            <Skeleton variant="rect" height={120} />
            <Skeleton variant="rect" height={80} />
          </div>
        </div>
      </div>
    </div>
  )
}
