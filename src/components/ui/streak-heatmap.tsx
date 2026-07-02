'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

interface StreakHeatmapProps {
  /** ISO date strings of activity days */
  activityDays: string[]
  /** Number of weeks to show (default 13 ≈ 3 months) */
  weeks?: number
  className?: string
}

/**
 * GitHub-style activity heatmap.
 * Renders `weeks` columns × 7 rows (Sun–Sat), oldest first → newest last.
 */
export function StreakHeatmap({ activityDays, weeks = 13, className }: StreakHeatmapProps) {
  const grid = useMemo(() => {
    const daySet = new Set(activityDays.map((d) => d.slice(0, 10)))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // Find Sunday of the current week
    const end = new Date(today)
    end.setDate(end.getDate() - end.getDay())
    // Total days = weeks * 7; start = end - (weeks*7 - 1) days, going back to that Sunday
    const totalDays = weeks * 7
    const start = new Date(end)
    start.setDate(start.getDate() - (totalDays - 1))

    const cells: { date: Date; count: number; future: boolean }[] = []
    const cursor = new Date(start)
    for (let i = 0; i < totalDays; i++) {
      const iso = cursor.toISOString().slice(0, 10)
      const future = cursor.getTime() > today.getTime()
      cells.push({ date: new Date(cursor), count: daySet.has(iso) ? 1 : 0, future })
      cursor.setDate(cursor.getDate() + 1)
    }
    // Reshape into weeks columns (each column is 7 days)
    const columns: { date: Date; count: number; future: boolean }[][] = []
    for (let w = 0; w < weeks; w++) {
      columns.push(cells.slice(w * 7, w * 7 + 7))
    }
    return columns
  }, [activityDays, weeks])

  const totalActive = activityDays.length

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{totalActive}</span>
          <span className="text-[11px] text-muted-foreground">active days</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="h-2.5 w-2.5 rounded-sm bg-muted" />
          <div className="h-2.5 w-2.5 rounded-sm bg-primary/30" />
          <div className="h-2.5 w-2.5 rounded-sm bg-primary/60" />
          <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
          <span>More</span>
        </div>
      </div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {grid.map((col, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {col.map((cell, j) => (
              <Tooltip key={j}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'h-2.5 w-2.5 rounded-sm heatmap-cell',
                      cell.future
                        ? 'bg-transparent'
                        : cell.count > 0
                          ? 'bg-primary shadow-sm'
                          : 'bg-muted'
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="py-1 text-xs">
                  <span className="font-medium">
                    {cell.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    {cell.future ? 'upcoming' : cell.count > 0 ? '· active' : '· no activity'}
                  </span>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{grid[0]?.[0]?.date.toLocaleDateString('en-IN', { month: 'short' })}</span>
        <span>Today</span>
      </div>
    </div>
  )
}
