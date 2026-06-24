import type { ViewKey } from './types'

const VIEW_ROUTES: Record<ViewKey, string> = {
  dashboard: '/dashboard',
  learn: '/learn',
  practice: '/practice',
  tutor: '/tutor',
  labs: '/labs',
  coding: '/coding',
  exams: '/exams',
  revision: '/revision',
  materials: '/materials',
  planner: '/planner',
  analytics: '/analytics',
  profile: '/profile',
}

export function routeForView(view: ViewKey): string {
  return VIEW_ROUTES[view]
}
