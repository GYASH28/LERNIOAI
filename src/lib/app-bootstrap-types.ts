import type { Subject, User } from './types'

export interface DashboardProgressSnapshot {
  mastery: unknown[]
  lessonCompletions: unknown[]
  questionAttempts: unknown[]
  quizAttempts: unknown[]
  studySessions: unknown[]
}

export interface DashboardActivitySnapshot {
  xpByDay: number[]
  activeDays: string[]
  minutesToday: number
  dailyGoalMins: number
}

export interface DashboardSnapshot {
  progress: DashboardProgressSnapshot | null
  revisionDue: unknown[]
  tasks: unknown[]
  achievements: unknown[]
  activity: DashboardActivitySnapshot | null
}

export interface AppBootstrapData {
  user: User | null
  subjects: Subject[]
  dashboard: DashboardSnapshot | null
}
