'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlayCircle, Clock, ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export function ContinueLearningCard() {
  const [items, setItems] = useState<{id:string;title:string;href:string;viewedAt:string}[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recently-viewed').then(r => r.json()).then(d => { setItems(d?.data ?? d ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton variant="rect" height={120} />
  if (items.length === 0) return (
    <Link href="/learn" className="block rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 hover:bg-primary/10 transition-colors">
      <div className="flex items-center gap-3"><PlayCircle className="h-8 w-8 text-primary" /><div><h3 className="text-base font-semibold">Start Learning</h3><p className="text-sm text-muted-foreground">Browse your curriculum and watch your first lecture</p></div></div>
    </Link>
  )
  const latest = items[0]!
  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Continue Where You Left Off</h3><Link href="/learn" className="text-xs text-muted-foreground hover:text-primary">View all</Link></div>
      <Link href={latest.href} className="flex items-center gap-4 group">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-110"><PlayCircle className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1"><p className="truncate text-base font-semibold">{latest.title}</p><p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Last viewed {new Date(latest.viewedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p></div>
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
      </Link>
      {items.length > 1 && <div className="mt-3 flex gap-2">{items.slice(1,4).map(i => <Link key={i.id} href={i.href} className="flex-1 truncate rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-accent/5">{i.title}</Link>)}</div>}
    </div>
  )
}
