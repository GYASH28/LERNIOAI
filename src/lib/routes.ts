/**
 * Canonical route registry for Lernio AI.
 *
 * This is the SINGLE source of truth for all student-facing navigation.
 * Top bar, sidebar, mobile nav, and command palette all consume this.
 * Do NOT duplicate route definitions in individual components.
 */

import {
  LayoutDashboard, BookOpen, Bot, PenTool, Layers, GraduationCap,
  Code2, FlaskConical, CalendarCheck, BarChart3, User, FileText,
  Trophy, Users, Bell, Settings, HelpCircle, MessageSquare,
  type LucideIcon,
} from 'lucide-react'

export interface RouteEntry {
  /** Route path for Next.js Link */
  path: string
  /** Display label */
  label: string
  /** Icon from lucide-react */
  icon: LucideIcon
  /** View key for LearningApp client-side routing (if applicable) */
  view?: string
  /** Whether this route is in the bottom nav on mobile */
  mobilePrimary?: boolean
  /** Group for the "More" sheet on mobile */
  group?: 'study' | 'organise' | 'connect' | 'account'
  /** Whether to show in command palette */
  inCommandPalette?: boolean
  /** Short description for command palette / tooltips */
  description?: string
}

export const ROUTES: RouteEntry[] = [
  // Primary navigation (bottom bar on mobile)
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard, view: 'dashboard', mobilePrimary: true, inCommandPalette: true, description: 'Your daily learning dashboard' },
  { path: '/learn', label: 'Learn', icon: BookOpen, view: 'learn', mobilePrimary: true, inCommandPalette: true, description: 'Browse subjects and lessons' },
  { path: '/practice', label: 'Practice', icon: PenTool, view: 'practice', mobilePrimary: true, inCommandPalette: true, description: 'Practice quizzes and questions' },
  { path: '/tutor', label: 'LEO', icon: Bot, view: 'tutor', mobilePrimary: true, inCommandPalette: true, description: 'Ask the AI tutor anything' },

  // Study group
  { path: '/materials', label: 'Materials', icon: FileText, view: 'materials', group: 'study', inCommandPalette: true, description: 'Download notes and PDFs' },
  { path: '/revision', label: 'Revision', icon: Layers, view: 'revision', group: 'study', inCommandPalette: true, description: 'Spaced-repetition flashcards' },
  { path: '/exams', label: 'Exams', icon: GraduationCap, view: 'exams', group: 'study', inCommandPalette: true, description: 'Mock exams and tests' },
  { path: '/labs', label: 'Labs', icon: FlaskConical, view: 'labs', group: 'study', inCommandPalette: true, description: 'Interactive lab simulations' },
  { path: '/coding', label: 'Coding', icon: Code2, view: 'coding', group: 'study', inCommandPalette: true, description: 'Code editor and challenges' },

  // Organise group
  { path: '/planner', label: 'Planner', icon: CalendarCheck, view: 'planner', group: 'organise', inCommandPalette: true, description: 'Plan your study schedule' },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, view: 'analytics', group: 'organise', inCommandPalette: true, description: 'Track your progress' },
  { path: '/notifications', label: 'Notifications', icon: Bell, group: 'organise', inCommandPalette: true, description: 'Your notifications' },

  // Connect group
  { path: '/community', label: 'Community', icon: Users, group: 'connect', inCommandPalette: true, description: 'Class community and polls' },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy, group: 'connect', inCommandPalette: true, description: 'See top students' },

  // Account group
  { path: '/profile', label: 'Profile', icon: User, view: 'profile', group: 'account', inCommandPalette: true, description: 'Your profile and achievements' },
  { path: '/settings', label: 'Settings', icon: Settings, group: 'account', inCommandPalette: true, description: 'Theme and preferences' },
  { path: '/help', label: 'Help', icon: HelpCircle, group: 'account', inCommandPalette: true, description: 'Help and support' },
  { path: '/feedback', label: 'Feedback', icon: MessageSquare, group: 'account', inCommandPalette: true, description: 'Send feedback to the team' },
]

/** Routes shown in the bottom navigation on mobile */
export const MOBILE_PRIMARY_ROUTES = ROUTES.filter(r => r.mobilePrimary)

/** Routes grouped by their group property (for the More sheet) */
export const ROUTES_BY_GROUP = {
  study: ROUTES.filter(r => r.group === 'study'),
  organise: ROUTES.filter(r => r.group === 'organise'),
  connect: ROUTES.filter(r => r.group === 'connect'),
  account: ROUTES.filter(r => r.group === 'account'),
}

/** All routes that should appear in the command palette */
export const COMMAND_PALETTE_ROUTES = ROUTES.filter(r => r.inCommandPalette)

/** Find a route by view key */
export function routeByView(view: string): RouteEntry | undefined {
  return ROUTES.find(r => r.view === view)
}

/** Find a route by path */
export function routeByPath(path: string): RouteEntry | undefined {
  return ROUTES.find(r => r.path === path)
}

// Backwards-compatible view→path mapping (used by existing components)
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
  community: '/community',
  leaderboard: '/leaderboard',
  achievements: '/achievements',
  notifications: '/notifications',
  attendance: '/attendance',
  class: '/class',
}

export function routeForView(view: ViewKey): string {
  return VIEW_ROUTES[view] || '/dashboard'
}
