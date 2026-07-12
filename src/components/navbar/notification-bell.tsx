'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      // silent fail
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })))
      setUnreadCount(0)
    } catch {
      // silent fail
    }
  }

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // silent fail
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((p) => !p)
          if (!open) fetchNotifications()
        }}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${unreadCount > 0 ? 'pulse-glow' : ''}`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-border bg-popover shadow-lg">
            <div className="flex items-center justify-between border-b border-border p-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Loading...</p>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center p-6 text-center">
                  <div className="mb-2 text-3xl">☕</div>
                  <p className="text-sm font-medium">You're all caught up!</p>
                  <p className="text-xs text-muted-foreground">No new notifications right now.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markRead(n.id)
                      if (n.link) window.location.href = n.link
                    }}
                    className={`flex w-full flex-col gap-1 border-b border-border/50 p-3 text-left transition-colors hover:bg-accent/50 ${
                      !n.readAt ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {!n.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      <p className="text-sm font-medium">{n.title}</p>
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(n.createdAt).toLocaleString('en-IN')}
                    </p>
                  </button>
                ))
              )}
            </div>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-border p-2 text-center text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              View all
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
