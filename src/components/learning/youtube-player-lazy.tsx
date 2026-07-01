import dynamic from 'next/dynamic'

// Dynamic imports for heavy components to reduce initial bundle size.
// These components are only loaded when needed (Phase 20: Performance).

const YouTubePlayerLazy = dynamic(
  () => import('./youtube-player').then((m) => m.YouTubePlayer),
  {
    loading: () => (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="aspect-video w-full animate-pulse bg-muted" />
        <div className="space-y-2 p-4">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
    ),
    ssr: true,
  },
)

export { YouTubePlayerLazy as YouTubePlayer }
