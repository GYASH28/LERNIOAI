'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, ArrowRight, RotateCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

interface RecentItem {
  id: string
  resourceType: string
  resourceId: string
  title: string
  href: string
  viewedAt: string
}

export function ContinueLearningWidget() {
  const [items, setItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recently-viewed')
      .then((r) => r.json())
      .then((data) => {
        setItems(data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4" aria-hidden="true">
        <p className="text-sm font-semibold">Continue Learning</p>
        <div className="mt-3 space-y-2">
          <Skeleton variant="rect" height={40} />
          <Skeleton variant="rect" height={40} />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-semibold">Continue Learning</p>
        <div className="mt-3">
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="No lessons visited yet"
            description="Start learning to see your recent activity here."
            action={{ label: 'Browse lessons', href: '/learn' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Continue Learning</p>
        <Link href="/learn" className="text-xs text-muted-foreground hover:text-primary">
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center gap-3 rounded-md border border-border/50 p-2.5 transition-colors hover:bg-accent/50"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <RotateCw className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(item.viewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  )
}
