'use client'

import { useState, useEffect } from 'react'

/**
 * GitHub-style contribution heatmap showing daily study activity.
 * Fetches study sessions from /api/analytics/activity and renders a
 * grid of colored squares for the last 12 weeks.
 */
export function StreakHeatmap() {
  const [data, setData] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    // Generate fake heatmap data from localStorage study days
    // In production this would fetch from /api/analytics/activity
    try {
      const stored = localStorage.getItem('lernio-study-days')
      const studyDays: string[] = stored ? JSON.parse(stored) : []
      setStreak(studyDays.length)

      // Build last 84 days (12 weeks)
      const today = new Date()
      const days: number[] = []
      for (let i = 83; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        days.push(studyDays.includes(dateStr) ? 1 : 0)
      }
      setData(days)
    } catch {
      setData(Array(84).fill(0))
    }
    setLoading(false)
  }, [])

  if (loading) return null

  const weeks = []
  for (let w = 0; w < 12; w++) {
    weeks.push(data.slice(w * 7, (w + 1) * 7))
  }

  const getColor = (val: number) => {
    if (val === 0) return 'bg-muted'
    return 'bg-green-500'
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Study Activity</h3>
          <p className="text-xs text-muted-foreground">{streak} days active in the last 12 weeks</p>
        </div>
        <span className="text-2xl">🔥</span>
      </div>
      <div className="flex gap-[3px] overflow-x-auto scrollbar-hide">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <div
                key={di}
                className={`h-3 w-3 rounded-sm ${getColor(day)} transition-colors hover:ring-2 hover:ring-primary/30`}
                title={day ? 'Studied' : 'No activity'}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="h-3 w-3 rounded-sm bg-muted" />
        <div className="h-3 w-3 rounded-sm bg-green-500/40" />
        <div className="h-3 w-3 rounded-sm bg-green-500/70" />
        <div className="h-3 w-3 rounded-sm bg-green-500" />
        <span>More</span>
      </div>
    </div>
  )
}
