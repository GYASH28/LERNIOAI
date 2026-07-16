'use client'

import { useState, useEffect } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { toast } from 'sonner'

interface BookmarkButtonProps {
  resourceType: string // 'lesson' | 'resource' | 'subject'
  resourceId: string
  label?: string
  size?: 'sm' | 'md'
}

export function BookmarkButton({ resourceType, resourceId, label, size = 'md' }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if already bookmarked
    fetch('/api/bookmarks')
      .then((r) => r.json())
      .then((data) => {
        const exists = data?.some((b: { resourceType: string; resourceId: string }) =>
          b.resourceType === resourceType && b.resourceId === resourceId
        )
        setBookmarked(exists)
      })
      .catch(() => {})
  }, [resourceType, resourceId])

  const toggle = async () => {
    setLoading(true)
    try {
      if (bookmarked) {
        // Find and delete
        const res = await fetch('/api/bookmarks')
        const data = await res.json()
        const bookmark = data?.find((b: { resourceType: string; resourceId: string; id: string }) =>
          b.resourceType === resourceType && b.resourceId === resourceId
        )
        if (bookmark) {
          await fetch(`/api/bookmarks/${bookmark.id}`, { method: 'DELETE' })
        }
        setBookmarked(false)
        // Micro-improvement: surface the toggle so users get confirmation
        // that their bookmark was actually removed (no silent failures).
        toast.success('Bookmark removed', {
          description: label ? `“${label}” was removed from your saves.` : 'Removed from your saves.',
        })
      } else {
        await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceType, resourceId, label }),
        })
        setBookmarked(true)
        toast.success('Bookmarked', {
          description: label ? `“${label}” saved. Find it in your bookmarks.` : 'Saved to your bookmarks.',
        })
      }
    } catch {
      // Micro-improvement: tell the user something went wrong instead of
      // failing silently — they clicked the button and expect feedback.
      toast.error('Could not update bookmark', {
        description: 'Please check your connection and try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        bookmarked
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:bg-accent'
      }`}
      aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
      aria-pressed={bookmarked}
    >
      {bookmarked ? (
        <BookmarkCheck className={iconSize} />
      ) : (
        <Bookmark className={iconSize} />
      )}
      {size === 'md' && (bookmarked ? 'Saved' : 'Bookmark')}
    </button>
  )
}
