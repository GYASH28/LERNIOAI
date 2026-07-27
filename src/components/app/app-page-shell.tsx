import type { ReactNode } from 'react'
import type { ViewKey } from '@/lib/types'
import { cn } from '@/lib/utils'

export type AppPageShellVariant =
  | 'dashboard'
  | 'reading'
  | 'workspace'
  | 'focus'
  | 'fullWidth'
  | 'analytics'
  | 'profile'

const VARIANT_BY_VIEW: Record<ViewKey, AppPageShellVariant> = {
  dashboard: 'dashboard',
  learn: 'reading',
  practice: 'focus',
  tutor: 'workspace',
  labs: 'workspace',
  coding: 'workspace',
  exams: 'focus',
  revision: 'focus',
  materials: 'workspace',
  planner: 'dashboard',
  analytics: 'analytics',
  profile: 'profile',
  community: 'fullWidth',
  leaderboard: 'fullWidth',
  achievements: 'fullWidth',
  notifications: 'fullWidth',
  attendance: 'fullWidth',
  class: 'fullWidth',
}

export function shellVariantForView(view: ViewKey): AppPageShellVariant {
  return VARIANT_BY_VIEW[view]
}

export function AppPageShell({
  children,
  variant,
  className,
}: {
  children: ReactNode
  variant: AppPageShellVariant
  className?: string
}) {
  return (
    <div
      className={cn(
        'app-page-shell',
        `app-page-shell--${variant}`,
        className,
      )}
    >
      {children}
    </div>
  )
}
