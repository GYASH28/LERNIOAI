import { cn } from '@/lib/utils'
import type { CSSProperties, ReactNode } from 'react'

/**
 * Reusable skeleton loader.
 * Use `variant` to pick the shape, or compose multiple for complex layouts.
 *
 * Audit fix: addresses the "loading states show a blank page" issue.
 * Replace every `isLoading` branch with skeletons that match the content layout.
 */
export function Skeleton({
  variant = 'text',
  className,
  width,
  height,
  style,
  children,
  ...rest
}: {
  variant?: 'text' | 'circle' | 'rect' | 'card'
  className?: string
  width?: string | number
  height?: string | number
  style?: CSSProperties
  children?: ReactNode
  [key: string]: unknown
}) {
  const base = 'animate-pulse bg-muted'
  const shapes: Record<string, string> = {
    text: 'h-4 w-full rounded',
    circle: 'h-10 w-10 rounded-full',
    rect: 'h-20 w-full rounded-md',
    card: 'h-32 w-full rounded-lg',
  }
  const computedStyle: React.CSSProperties = { ...style }
  if (width !== undefined) computedStyle.width = typeof width === 'number' ? `${width}px` : width
  if (height !== undefined) computedStyle.height = typeof height === 'number' ? `${height}px` : height
  return <div className={cn(base, shapes[variant], className)} style={computedStyle} aria-hidden="true" {...rest}>{children}</div>
}

/** Skeleton block for a list of N items (e.g. dashboard widgets). */
export function SkeletonList({ count = 3, variant = 'card' as const }: { count?: number; variant?: 'card' | 'rect' }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant={variant} />
      ))}
    </div>
  )
}

/** Full-page skeleton for initial route loads. */
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6" aria-hidden="true">
      <Skeleton variant="text" width={200} height={28} />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
      <SkeletonList count={4} />
    </div>
  )
}
