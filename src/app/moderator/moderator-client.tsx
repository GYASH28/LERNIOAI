'use client'

import { useState } from 'react'
import { Shield, Flag, Bot, CheckCircle2, XCircle, AlertTriangle, Eye } from 'lucide-react'

interface ModeratorPost {
  id: string
  title: string | null
  body: string
  reports: number
  status: string
  aiFlagged: boolean
  aiFlagReason: string | null
  author: { name: string; email: string }
  createdAt: string
}

interface ModeratorClientProps {
  reportedPosts: ModeratorPost[]
  flaggedPosts: ModeratorPost[]
}

export function ModeratorClient({ reportedPosts: initialReported, flaggedPosts: initialFlagged }: ModeratorClientProps) {
  const [tab, setTab] = useState<'reported' | 'flagged'>('reported')
  const [reported, setReported] = useState(initialReported)
  const [flagged, setFlagged] = useState(initialFlagged)

  const moderate = async (postId: string, action: 'approve' | 'remove') => {
    try {
      await fetch('/api/community/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action }),
      })
      setReported(prev => prev.filter(p => p.id !== postId))
      setFlagged(prev => prev.filter(p => p.id !== postId))
    } catch {}
  }

  const posts = tab === 'reported' ? reported : flagged

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Shield className="h-6 w-6 text-primary" />
          Moderator Queue
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review reported and AI-flagged content. Approve to keep visible, remove to hide from students.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-red-500" />
            <p className="text-sm font-semibold">Reported (Auto-Hidden)</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">{reported.length}</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold">AI-Flagged</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{flagged.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-card p-1">
        <button
          onClick={() => setTab('reported')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            tab === 'reported' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
          }`}
          type="button"
        >
          <Flag className="h-4 w-4" />
          Reported ({reported.length})
        </button>
        <button
          onClick={() => setTab('flagged')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            tab === 'flagged' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
          }`}
          type="button"
        >
          <Bot className="h-4 w-4" />
          AI-Flagged ({flagged.length})
        </button>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
          <p className="mt-3 text-sm font-semibold">All clear!</p>
          <p className="mt-1 text-xs text-muted-foreground">No {tab === 'reported' ? 'reported' : 'AI-flagged'} content needs review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{post.author.name}</span>
                <span>·</span>
                <span>{post.author.email}</span>
                <span>·</span>
                <span>{new Date(post.createdAt).toLocaleString('en-IN')}</span>
                {tab === 'reported' && (
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600">
                    {post.reports} reports
                  </span>
                )}
                {post.aiFlagged && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                    AI Flagged
                  </span>
                )}
              </div>
              {post.title && <h3 className="text-sm font-semibold">{post.title}</h3>}
              <p className="mt-1 text-sm text-muted-foreground">{post.body}</p>
              {post.aiFlagReason && (
                <div className="mt-2 rounded-md bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                  AI reason: {post.aiFlagReason}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => moderate(post.id, 'approve')}
                  className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                  type="button"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => moderate(post.id, 'remove')}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                  type="button"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
