import { Skeleton } from '@/components/ui/skeleton'
export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6" aria-hidden="true">
      <Skeleton variant="text" width={100} height={24} />
      <div className="mt-6">
        <Skeleton variant="rect" height={400} />
      </div>
    </div>
  )
}
