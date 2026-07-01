import { Skeleton } from '@/components/ui/skeleton'

export default function LearnLoading() {
  return (
    <div className="min-h-screen bg-background" aria-hidden="true">
      <div className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton variant="text" width={80} height={16} />
          <Skeleton variant="text" width={200} height={28} className="mt-3" />
          <Skeleton variant="text" width={300} height={14} className="mt-2" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rect" height={72} />
        ))}
      </div>
    </div>
  )
}
