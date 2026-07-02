'use client'

/**
 * Circular progress ring (like Apple Watch activity rings).
 * Shows completion percentage with a colored arc.
 */
export function ProgressRing({
  value,
  size = 40,
  strokeWidth = 4,
  color = '#357fa4',
  label,
}: {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ fontSize: size < 50 ? '9px' : '11px' }}>
        {label ?? `${Math.round(value)}%`}
      </span>
    </div>
  )
}
