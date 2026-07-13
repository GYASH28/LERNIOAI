'use client'

import { GraduationCap } from 'lucide-react'
import type { CSSProperties } from 'react'

interface ClassAvatarProps {
  emoji?: string | null
  color?: string | null
  division?: string | null
  semesterNumber?: number | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<ClassAvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-sm rounded-md',
  md: 'h-12 w-12 text-xl rounded-lg',
  lg: 'h-16 w-16 text-2xl rounded-xl',
}

export function ClassAvatar({ emoji, color, division, semesterNumber, size = 'md', className = '' }: ClassAvatarProps) {
  const style: CSSProperties = color
    ? { backgroundColor: `${color}22`, borderColor: `${color}55`, color }
    : {}

  if (emoji) {
    return (
      <div
        className={`flex items-center justify-center border ${SIZE_CLASSES[size]} ${className}`}
        style={style}
        aria-label={`Class avatar: ${emoji}`}
        title={semesterNumber ? `Semester ${semesterNumber}` : undefined}
      >
        <span className="leading-none">{emoji}</span>
      </div>
    )
  }

  if (color) {
    return (
      <div
        className={`flex items-center justify-center border font-bold ${SIZE_CLASSES[size]} ${className}`}
        style={style}
      >
        {(division || '?').charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 text-violet-500 border border-violet-500/20 ${SIZE_CLASSES[size]} ${className}`}
    >
      <GraduationCap className={size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-7 w-7'} />
    </div>
  )
}
