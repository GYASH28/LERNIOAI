'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface WeeklyXpChartProps {
  /** Array of 7 numbers — XP earned per day, oldest first */
  xpByDay: number[]
  /** Optional labels for each day, default Mon–Sun short names */
  labels?: string[]
  className?: string
}

/**
 * Compact bar chart of XP earned over the last 7 days.
 * Pure SVG (no recharts dependency) for fast first paint on dashboard.
 */
export function WeeklyXpChart({ xpByDay, labels, className }: WeeklyXpChartProps) {
  const safeData = useMemo(() => {
    const d = xpByDay.length === 7 ? xpByDay : Array.from({ length: 7 }, (_, i) => xpByDay[i] || 0)
    return d
  }, [xpByDay])

  const defaultLabels = useMemo(() => {
    const today = new Date()
    const out: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      out.push(d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2))
    }
    return out
  }, [])

  const lbls = labels || defaultLabels
  const maxVal = Math.max(...safeData, 30)
  const total = safeData.reduce((a, b) => a + b, 0)
  const avg = total > 0 ? Math.round(total / 7) : 0

  const barW = 100 / 7
  const chartH = 80

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tabular-nums">{total}</span>
          <span className="text-[11px] text-muted-foreground">XP this week</span>
        </div>
        <span className="text-[10px] text-muted-foreground">avg {avg}/day</span>
      </div>
      <div className="relative" style={{ height: chartH }}>
        <svg
          viewBox={`0 0 100 ${chartH}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="weeklyXpGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {/* Baseline */}
          <line x1="0" y1={chartH - 0.5} x2="100" y2={chartH - 0.5} stroke="var(--border)" strokeWidth="0.4" />
          {safeData.map((v, i) => {
            const h = v > 0 ? Math.max(2, (v / maxVal) * (chartH - 8)) : 0
            const x = i * barW + barW * 0.2
            const w = barW * 0.6
            const y = chartH - h
            const isToday = i === 6
            return (
              <g key={i}>
                {v > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx="1"
                    fill="url(#weeklyXpGrad)"
                    className="transition-all"
                    style={isToday ? { filter: 'drop-shadow(0 0 3px var(--primary))' } : undefined}
                  />
                )}
                {v === 0 && (
                  <rect
                    x={x}
                    y={chartH - 2}
                    width={w}
                    height="1.2"
                    rx="0.5"
                    fill="var(--muted-foreground)"
                    opacity="0.3"
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        {lbls.map((l, i) => (
          <span key={i} className={cn('flex-1 text-center', i === 6 && 'text-primary font-semibold')}>
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}
