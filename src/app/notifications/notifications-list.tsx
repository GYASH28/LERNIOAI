'use client'

import { useState } from 'react'
import { Bell, CheckCheck, BellOff } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

export function NotificationsList({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications)

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })))
  }

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <BellOff className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No notifications yet</p>
        <p className="text-xs text-muted-foreground/60">
          You&apos;ll see achievement unlocks, streak warnings, and updates here.
        </p>
      </div>
    )
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <button
          onClick={markAllRead}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <CheckCheck className="h-3 w-3" />
          Mark all as read ({unreadCount})
        </button>
      )}
      {notifications.map((n) => (
        <button
          key={n.id}
          onClick={() => {
            markRead(n.id)
            if (n.link) window.location.href = n.link
          }}
          className={`flex w-full flex-col gap-1 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50 ${
            !n.readAt ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            {!n.readAt && <span className="h-2 w-2 rounded-full bg-primary" />}
            <p className="text-sm font-medium">{n.title}</p>
          </div>
          {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
          <p className="text-[10px] text-muted-foreground/60">
            {new Date(n.createdAt).toLocaleString('en-IN')}
          </p>
        </button>
      ))}
    </div>
  )
}
