'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageCircle, Users, Rss, Plus, ChevronRight, ThumbsUp,
  Award, Clock, Bot, Flag, Send, ArrowLeft, BookOpen
} from 'lucide-react'

type Tab = 'discussions' | 'feed' | 'groups'

interface Post {
  id: string
  authorName: string
  authorDept: string
  authorSemester: number
  section: string
  title: string | null
  body: string
  postType: string
  status: string
  commentCount: number
  upvotes: number
  isAnswered: boolean
  aiResponse?: string | null
  createdAt: string
}

interface Group {
  id: string
  name: string
  description: string | null
  subjectName: string | null
  semesterNumber: number | null
  memberCount: number
  visibility: string
  isMember: boolean
}

export function CommunityClient() {
  const [tab, setTab] = useState<Tab>('discussions')
  const [posts, setPosts] = useState<Post[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showComposer, setShowComposer] = useState(false)
  const [composerTitle, setComposerTitle] = useState('')
  const [composerBody, setComposerBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [commentText, setCommentText] = useState('')
  const [browsingWide, setBrowsingWide] = useState(false)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/community/posts?section=${tab}&wide=${browsingWide}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setPosts(data.posts ?? [])
    } catch {
      setError('Failed to load posts. Please try again.')
    }
    setLoading(false)
  }, [tab, browsingWide])

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/community/posts?section=groups')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setGroups(data.groups ?? [])
    } catch {
      setError('Failed to load groups.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'groups') fetchGroups()
    else fetchPosts()
  }, [tab, fetchPosts, fetchGroups])

  const submitPost = async () => {
    if (!composerBody.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: tab === 'groups' ? 'feed' : tab,
          title: composerTitle.trim() || undefined,
          body: composerBody.trim(),
          postType: tab === 'discussions' ? 'question' : 'freeform',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message || 'Failed to post')
      }
      setComposerTitle('')
      setComposerBody('')
      setShowComposer(false)
      fetchPosts()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post')
    }
    setPosting(false)
  }

  const loadComments = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/comments?postId=${postId}`)
      if (!res.ok) return
      const data = await res.json()
      setComments(prev => ({ ...prev, [postId]: data.comments ?? [] }))
    } catch {}
  }

  const submitComment = async (postId: string) => {
    if (!commentText.trim()) return
    try {
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, body: commentText.trim() }),
      })
      if (!res.ok) return
      setCommentText('')
      loadComments(postId)
      fetchPosts()
    } catch {}
  }

  const voteComment = async (commentId: string, postId: string) => {
    try {
      await fetch('/api/community/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      })
      loadComments(postId)
    } catch {}
  }

  const reportPost = async (postId: string) => {
    try {
      await fetch('/api/community/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, reason: 'Inappropriate content' }),
      })
    } catch {}
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask questions, share milestones, and study together with your classmates.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-card p-1">
        <TabButton active={tab === 'discussions'} onClick={() => setTab('discussions')} icon={MessageCircle} label="Discussions" />
        <TabButton active={tab === 'feed'} onClick={() => setTab('feed')} icon={Rss} label="Feed" />
        <TabButton active={tab === 'groups'} onClick={() => setTab('groups')} icon={Users} label="Study Groups" />
      </div>

      {/* Browse scope toggle */}
      {tab !== 'groups' && (
        <div className="mb-4 flex items-center gap-2 text-xs">
          <button
            onClick={() => setBrowsingWide(!browsingWide)}
            className={`rounded-full px-3 py-1 font-semibold transition-colors ${
              browsingWide ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
            type="button"
          >
            {browsingWide ? '🌐 All Departments' : '📚 My Department'}
          </button>
          <span className="text-muted-foreground">
            {browsingWide ? 'Showing posts from all departments' : 'Showing posts from your department only'}
          </span>
        </div>
      )}

      {/* New post button */}
      {tab !== 'groups' && (
        <button
          onClick={() => setShowComposer(!showComposer)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
          type="button"
        >
          <Plus className="h-4 w-4" />
          {tab === 'discussions' ? 'Ask a Question' : 'Share a Milestone'}
        </button>
      )}

      {/* Composer */}
      {showComposer && (
        <div className="mb-4 rounded-lg border border-border bg-card p-4">
          {tab === 'discussions' && (
            <input
              type="text"
              value={composerTitle}
              onChange={(e) => setComposerTitle(e.target.value)}
              placeholder="Question title..."
              className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          )}
          <textarea
            value={composerBody}
            onChange={(e) => setComposerBody(e.target.value)}
            placeholder={tab === 'discussions' ? 'Describe your question...' : 'Share your achievement or thought...'}
            rows={4}
            className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={submitPost}
              disabled={posting || !composerBody.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              type="button"
            >
              <Send className="h-3.5 w-3.5" />
              {posting ? 'Posting...' : 'Post'}
            </button>
            <button
              onClick={() => setShowComposer(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">{error}</div>}

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : tab === 'groups' ? (
        <GroupList groups={groups} />
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No {tab === 'discussions' ? 'questions' : 'posts'} yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tab === 'discussions' ? 'Be the first to ask a question!' : 'Share your first milestone!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{post.authorName}</span>
                    <span>·</span>
                    <span>{post.authorDept} · Sem {post.authorSemester}</span>
                    <span>·</span>
                    <span>{timeAgo(post.createdAt)}</span>
                    {post.isAnswered && (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-600">
                        ✓ Answered
                      </span>
                    )}
                  </div>
                  {post.title && <h3 className="mt-1.5 text-sm font-semibold">{post.title}</h3>}
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{post.body}</p>

                  {/* AI Response */}
                  {post.aiResponse && (
                    <div className="mt-3 rounded-md border border-violet-500/20 bg-violet-500/5 p-3">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-violet-600">
                        <Bot className="h-3.5 w-3.5" />
                        LEO's Take
                        <span className="text-[10px] font-normal text-muted-foreground">— AI-generated, not a peer answer</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{post.aiResponse}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <button
                  onClick={() => {
                    if (expandedPost === post.id) {
                      setExpandedPost(null)
                    } else {
                      setExpandedPost(post.id)
                      loadComments(post.id)
                    }
                  }}
                  className="flex items-center gap-1 hover:text-foreground"
                  type="button"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}
                </button>
                <button onClick={() => reportPost(post.id)} className="flex items-center gap-1 hover:text-foreground" type="button">
                  <Flag className="h-3.5 w-3.5" /> Report
                </button>
              </div>

              {/* Comments */}
              {expandedPost === post.id && (
                <div className="mt-4 border-t border-border pt-3">
                  {comments[post.id]?.length > 0 ? (
                    <div className="space-y-2">
                      {comments[post.id].map((c: any) => (
                        <div key={c.id} className={`rounded-md p-2.5 ${c.isBestAnswer ? 'border border-green-500/30 bg-green-500/5' : 'bg-muted/30'}`}>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{c.authorName}</span>
                            {c.isBestAnswer && <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-600">✓ Best Answer</span>}
                            <span>· {timeAgo(c.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-sm">{c.body}</p>
                          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                            <button onClick={() => voteComment(c.id, post.id)} className="flex items-center gap-1 hover:text-foreground" type="button">
                              <ThumbsUp className="h-3 w-3" /> {c.upvotes}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No replies yet. Be the first to help!</p>
                  )}

                  {/* Comment input */}
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitComment(post.id) }}
                      placeholder="Write a reply..."
                      className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => submitComment(post.id)}
                      disabled={!commentText.trim()}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      type="button"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FAB for mobile */}
      <button
        onClick={() => { setTab('feed'); setShowComposer(true) }}
        className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors md:hidden"
        type="button"
        aria-label="New post"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof MessageCircle; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
      type="button"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function GroupList({ groups }: { groups: Group[] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <Users className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm font-semibold">No study groups yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Default class groups are created automatically. Check back soon!</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{g.name}</h3>
            <p className="text-xs text-muted-foreground">
              {g.subjectName ?? 'General'} · {g.memberCount} members
              {g.semesterNumber && ` · Sem ${g.semesterNumber}`}
            </p>
          </div>
          {g.isMember ? (
            <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-bold text-green-600">Member</span>
          ) : (
            <button className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20" type="button">
              Join
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}
