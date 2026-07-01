import { Skeleton } from '@/components/ui/skeleton'

export default function LearnLoading() {
  return (
    <div className="space-y-4 p-6" aria-hidden="true">
      <Skeleton variant="text" width={150} height={24} />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rect" height={72} />
        ))}
      </div>
    </div>
  )
}
