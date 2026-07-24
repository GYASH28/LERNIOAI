import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div
      className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8"
      aria-hidden="true"
    >
      <Skeleton variant="text" width={180} height={28} />
      <Skeleton variant="text" width={300} height={14} className="mt-1" />
      <div className="mt-6 space-y-4">
        <Skeleton variant="rect" height={120} />
        <Skeleton variant="rect" height={80} />
        <Skeleton variant="rect" height={48} />
      </div>
    </div>
  )
}
