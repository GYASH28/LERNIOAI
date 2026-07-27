'use client'

import { useState } from 'react'
import { Loader2, Pin, PinOff, Pencil, Trash2, Crown, ShieldCheck } from 'lucide-react'

export interface AnnouncementData {
  id: string
  title: string
  body: string
  pinned: boolean
  pinnedUntil: string | null
  createdAt: string
  author: { id: string; name: string; role: string }
}

interface Props {
  announcement: AnnouncementData
  currentUserId: string
  canModerate: boolean
  onChanged?: () => void
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function AnnouncementCard({ announcement, currentUserId, canModerate, onChanged }: Props) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(announcement.title)
  const [body, setBody] = useState(announcement.body)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isAuthor = announcement.author.id === currentUserId

  const saveEdit = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/class/announcements/${announcement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to save')
      }
      setEditing(false)
      onChanged?.()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const togglePin = async () => {
    setSaving(true)
    try {
      await fetch(`/api/class/announcements/${announcement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !announcement.pinned }),
      })
      onChanged?.()
    } finally {
      setSaving(false)
    }
  }

  const archive = async () => {
    if (!confirm('Delete this announcement?')) return
    setSaving(true)
    try {
      await fetch(`/api/class/announcements/${announcement.id}`, { method: 'DELETE' })
      onChanged?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`rounded-xl border bg-card p-4 ${announcement.pinned ? 'border-amber-500/40' : 'border-border'}`}>
      {announcement.pinned && (
        <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-amber-500">
          <Pin className="h-3 w-3" /> Pinned
          {announcement.pinnedUntil && (
            <span className="text-muted-foreground font-normal">
              · until {new Date(announcement.pinnedUntil).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {editing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold"
            maxLength={200}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            maxLength={4000}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setTitle(announcement.title)
                setBody(announcement.body)
              }}
              disabled={saving}
              className="rounded-md border border-border px-3 py-1 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-tight">{announcement.title}</h3>
            {(isAuthor || canModerate) && (
              <div className="flex items-center gap-1">
                {canModerate && (
                  <button
                    onClick={togglePin}
                    disabled={saving}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-amber-500"
                    title={announcement.pinned ? 'Unpin' : 'Pin'}
                  >
                    {announcement.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                )}
                {isAuthor && (
                  <button
                    onClick={() => setEditing(true)}
                    disabled={saving}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-primary"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {(isAuthor || canModerate) && (
                  <button
                    onClick={archive}
                    disabled={saving}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/90">{announcement.body}</p>
        </>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        {announcement.author.role === 'cr' && <Crown className="h-3 w-3 text-amber-500" />}
        {['teacher', 'coordinator', 'admin'].includes(announcement.author.role) && (
          <ShieldCheck className="h-3 w-3 text-primary" />
        )}
        <span className="font-medium text-foreground">{announcement.author.name}</span>
        <span>· {formatRelative(announcement.createdAt)}</span>
      </div>
    </div>
  )
}

export function AnnouncementComposer({ classId, onPosted }: { classId?: string; onPosted?: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!title.trim() || !body.trim()) return
    setPosting(true)
    setError('')
    try {
      const res = await fetch('/api/class/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: classId || undefined, title: title.trim(), body: body.trim(), pinned }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to post')
      }
      setTitle('')
      setBody('')
      setPinned(false)
      setOpen(false)
      onPosted?.()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setPosting(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-border bg-card/50 p-4 text-left text-sm text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors"
      >
        + Post a new announcement…
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. 'Extra lecture on Friday')"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
        maxLength={200}
        autoFocus
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share details with your class…"
        rows={4}
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        maxLength={4000}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="accent-amber-500"
          />
          <span className="text-muted-foreground">Pin for 7 days</span>
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(false)}
            disabled={posting}
            className="rounded-md border border-border px-3 py-1.5 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={posting || !title.trim() || !body.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Post
          </button>
        </div>
      </div>
    </div>
  )
}
