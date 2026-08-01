import type { MascotKey } from '@/lib/types'

export type StudentLearningMode =
  | 'complete'
  | 'fast-track'
  | 'exam-crash'
  | 'weak-topic'
  | 'weekend-catch-up'
  | 'revision-only'
  | 'coding-practice'
  | 'low-bandwidth'

export type StudentLanguage = 'english' | 'hinglish' | 'marathi'
export type StudentLearningStyle = 'balanced' | 'visual' | 'practice-first' | 'video-first' | 'reading-first'

export interface StudentLearningProfile {
  programme: 'DCOMP' | 'DCIOT'
  semester: number
  dailyMinutes: number
  language: StudentLanguage
  learningStyle: StudentLearningStyle
  learningMode: StudentLearningMode
  mascot: MascotKey
  lowBandwidth: boolean
  soundEnabled: boolean
  reducedMotion: boolean
  weeklyGoalMinutes: number
}

export interface AdaptivePathDefinition {
  id: StudentLearningMode
  title: string
  description: string
  bestFor: string
  cadence: string
  accent: string
  steps: string[]
}

export interface StudentMissionDefinition {
  id: string
  title: string
  description: string
  minutes: number
  href: string
  category: 'learn' | 'video' | 'practice' | 'revision' | 'coding' | 'reflection'
  xp: number
}

export interface MascotDefinition {
  key: MascotKey
  name: string
  specialty: string
  description: string
  greeting: string
}

export const STUDENT_OS_STORAGE = {
  profile: 'lernio.student-os.profile.v1',
  missions: 'lernio.student-os.missions.v1',
  focus: 'lernio.student-os.focus.v1',
  notebook: 'lernio.student-os.notebook.v1',
} as const

export const DEFAULT_STUDENT_PROFILE: StudentLearningProfile = {
  programme: 'DCOMP',
  semester: 3,
  dailyMinutes: 90,
  language: 'english',
  learningStyle: 'balanced',
  learningMode: 'complete',
  mascot: 'leo',
  lowBandwidth: false,
  soundEnabled: false,
  reducedMotion: false,
  weeklyGoalMinutes: 450,
}

export const MASCOT_CATALOG: MascotDefinition[] = [
  {
    key: 'leo',
    name: 'LEO',
    specialty: 'General learning guide',
    description: 'Plans study sessions, explains difficult ideas and keeps the whole journey organised.',
    greeting: 'Let’s choose the smallest useful next step and finish it properly.',
  },
  {
    key: 'byte',
    name: 'BYTE',
    specialty: 'Algorithms and data structures',
    description: 'Turns abstract structures into visual sequences, traces and small challenges.',
    greeting: 'We will trace it once, visualise it once, and then solve it without help.',
  },
  {
    key: 'coda',
    name: 'CODA',
    specialty: 'Programming and debugging',
    description: 'Helps with code reading, debugging, test cases and progressive hints.',
    greeting: 'Show me the expected output and we will isolate the bug instead of guessing.',
  },
  {
    key: 'pico',
    name: 'PICO',
    specialty: 'Electronics and microprocessors',
    description: 'Explains circuits, instructions, registers and practical workflows step by step.',
    greeting: 'Let’s follow the signal, register or instruction one stage at a time.',
  },
  {
    key: 'nova',
    name: 'NOVA',
    specialty: 'Networks, communication and IoT',
    description: 'Maps packets, protocols, layers and connected-device behaviour into clear flows.',
    greeting: 'We will trace what is sent, where it travels and what each layer changes.',
  },
]

export const ADAPTIVE_PATHS: AdaptivePathDefinition[] = [
  {
    id: 'complete',
    title: 'Complete Learning',
    description: 'A balanced path through notes, video, practice and revision.',
    bestFor: 'Normal semester study',
    cadence: 'Learn → apply → revise',
    accent: 'border-violet-500/30 bg-violet-500/5',
    steps: ['Read the lesson', 'Watch the mapped video', 'Complete a short quiz', 'Create revision material'],
  },
  {
    id: 'fast-track',
    title: 'Fast Track',
    description: 'Prioritises essential concepts and one high-value practice set.',
    bestFor: 'Limited daily time',
    cadence: 'Core idea → example → check',
    accent: 'border-cyan-500/30 bg-cyan-500/5',
    steps: ['Read the quick explanation', 'Study one worked example', 'Answer five questions'],
  },
  {
    id: 'exam-crash',
    title: 'Exam Crash',
    description: 'Focuses on high-weightage topics, PYQs and timed recall.',
    bestFor: 'An exam approaching soon',
    cadence: 'Weightage → PYQ → correction',
    accent: 'border-rose-500/30 bg-rose-500/5',
    steps: ['Review high-weightage concepts', 'Attempt previous questions', 'Repair the mistake notebook'],
  },
  {
    id: 'weak-topic',
    title: 'Weak Topic Recovery',
    description: 'Rebuilds one weak concept using simpler explanations and progressive practice.',
    bestFor: 'Repeated mistakes',
    cadence: 'Diagnose → reteach → retry',
    accent: 'border-amber-500/30 bg-amber-500/5',
    steps: ['Take a readiness check', 'Use a different explanation', 'Retry with hints', 'Retest without hints'],
  },
  {
    id: 'weekend-catch-up',
    title: 'Weekend Catch-up',
    description: 'Groups unfinished work into realistic blocks with recovery breaks.',
    bestFor: 'Missed weekday tasks',
    cadence: 'Catch up → buffer → consolidate',
    accent: 'border-emerald-500/30 bg-emerald-500/5',
    steps: ['Finish one overdue lesson', 'Take a short break', 'Complete one practice set', 'Plan Monday'],
  },
  {
    id: 'revision-only',
    title: 'Revision Only',
    description: 'Uses spaced repetition, active recall and mistake correction without new lessons.',
    bestFor: 'A completed syllabus',
    cadence: 'Recall → rate → repair',
    accent: 'border-teal-500/30 bg-teal-500/5',
    steps: ['Review due cards', 'Attempt weak questions', 'Summarise from memory'],
  },
  {
    id: 'coding-practice',
    title: 'Coding Practice',
    description: 'Alternates code reading, debugging and small implementation challenges.',
    bestFor: 'Programming improvement',
    cadence: 'Read → predict → run → debug',
    accent: 'border-orange-500/30 bg-orange-500/5',
    steps: ['Predict program output', 'Solve one challenge', 'Debug one broken solution', 'Record the mistake'],
  },
  {
    id: 'low-bandwidth',
    title: 'Low Bandwidth',
    description: 'Prefers text, downloaded resources and short media segments.',
    bestFor: 'Slow or limited internet',
    cadence: 'Offline-first study',
    accent: 'border-slate-500/30 bg-slate-500/5',
    steps: ['Open downloaded notes', 'Use text explanations', 'Complete offline practice', 'Sync progress later'],
  },
]

export const DAILY_MISSION_TEMPLATES: StudentMissionDefinition[] = [
  {
    id: 'continue-lesson',
    title: 'Continue one lesson',
    description: 'Finish one meaningful lesson section instead of browsing several subjects.',
    minutes: 25,
    href: '/learn/current',
    category: 'learn',
    xp: 20,
  },
  {
    id: 'mapped-video',
    title: 'Watch one mapped explanation',
    description: 'Watch the lesson video and note one timestamp that needs clarification.',
    minutes: 18,
    href: '/learn/current',
    category: 'video',
    xp: 15,
  },
  {
    id: 'adaptive-practice',
    title: 'Complete a focused practice set',
    description: 'Answer a short set and review every incorrect response.',
    minutes: 20,
    href: '/practice',
    category: 'practice',
    xp: 20,
  },
  {
    id: 'due-revision',
    title: 'Clear due revision',
    description: 'Review due flashcards using Again, Hard, Good and Easy honestly.',
    minutes: 12,
    href: '/revision',
    category: 'revision',
    xp: 15,
  },
  {
    id: 'coding-rep',
    title: 'Solve one coding rep',
    description: 'Predict, run and debug one small program or algorithm.',
    minutes: 20,
    href: '/coding',
    category: 'coding',
    xp: 25,
  },
  {
    id: 'mistake-note',
    title: 'Record one useful mistake',
    description: 'Save what went wrong and the rule that will prevent it next time.',
    minutes: 5,
    href: '/notebook',
    category: 'reflection',
    xp: 10,
  },
]

export function getAdaptivePath(id: StudentLearningMode) {
  return ADAPTIVE_PATHS.find((path) => path.id === id) ?? ADAPTIVE_PATHS[0]
}

export function buildDailyMissions(dailyMinutes: number, mode: StudentLearningMode) {
  const preferredIdsByMode: Record<StudentLearningMode, string[]> = {
    complete: ['continue-lesson', 'mapped-video', 'adaptive-practice', 'due-revision'],
    'fast-track': ['continue-lesson', 'adaptive-practice', 'mistake-note'],
    'exam-crash': ['due-revision', 'adaptive-practice', 'mistake-note'],
    'weak-topic': ['continue-lesson', 'adaptive-practice', 'mistake-note'],
    'weekend-catch-up': ['continue-lesson', 'mapped-video', 'adaptive-practice', 'due-revision', 'mistake-note'],
    'revision-only': ['due-revision', 'adaptive-practice', 'mistake-note'],
    'coding-practice': ['coding-rep', 'adaptive-practice', 'mistake-note'],
    'low-bandwidth': ['continue-lesson', 'adaptive-practice', 'due-revision'],
  }

  const ordered = preferredIdsByMode[mode]
    .map((id) => DAILY_MISSION_TEMPLATES.find((mission) => mission.id === id))
    .filter((mission): mission is StudentMissionDefinition => Boolean(mission))

  const selected: StudentMissionDefinition[] = []
  let usedMinutes = 0
  for (const mission of ordered) {
    if (selected.length > 0 && usedMinutes + mission.minutes > dailyMinutes + 10) continue
    selected.push(mission)
    usedMinutes += mission.minutes
    if (usedMinutes >= Math.max(30, dailyMinutes - 10)) break
  }
  return selected.length > 0 ? selected : [DAILY_MISSION_TEMPLATES[0]]
}
