'use client'

import { cn } from '@/lib/utils'

interface DailyGoalRingProps {
  /** Current value (e.g., minutes studied today) */
  value: number
  /** Goal target (e.g., 60 minutes) */
  goal: number
  /** Optional unit label rendered under the number */
  unit?: string
  /** Size in px (default 96) */
  size?: number
  /** Stroke width (default 8) */
  stroke?: number
  className?: string
}

/**
 * Compact SVG ring showing progress toward a daily goal.
 * Color shifts as goal approaches (amber → primary → success).
 */
export function DailyGoalRing({
  value,
  goal,
  unit = 'min',
  size = 96,
  stroke = 8,
  className,
}: DailyGoalRingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = goal > 0 ? Math.min(1, value / goal) : 0
  const offset = c * (1 - pct)
  const remaining = Math.max(0, goal - value)
  const done = value >= goal && goal > 0

  const strokeColor = done
    ? 'var(--success)'
    : pct >= 0.7
      ? 'var(--success)'
      : pct >= 0.4
        ? 'var(--primary)'
        : 'var(--warning)'

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
          opacity="0.6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: `drop-shadow(0 0 4px ${strokeColor})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {done ? (
          <span className="text-base font-bold text-success">Done!</span>
        ) : (
          <>
            <span className="text-base font-bold tabular-nums leading-none">
              {Math.round(value)}
              <span className="text-[9px] text-muted-foreground ml-0.5 font-normal">/{goal}</span>
            </span>
            <span className="text-[9px] text-muted-foreground mt-0.5">{unit} today</span>
          </>
        )}
      </div>
      {!done && remaining > 0 && (
        <span className="sr-only">{Math.round(remaining)} {unit} remaining to hit daily goal</span>
      )}
    </div>
  )
}
