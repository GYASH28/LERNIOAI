// Shared types for Lernio AI 2.0

export type ViewKey =
  | 'dashboard'
  | 'learn'
  | 'practice'
  | 'tutor'
  | 'labs'
  | 'coding'
  | 'exams'
  | 'revision'
  | 'materials'
  | 'planner'
  | 'analytics'
  | 'profile'
  | 'community'
  | 'leaderboard'
  | 'achievements'
  | 'notifications'
  | 'attendance'
  | 'class'

export type LearningMode = 'learn' | 'simplify' | 'visualise' | 'practise' | 'revise'

export type MascotKey = 'leo' | 'byte' | 'coda' | 'pico' | 'nova'

export type MascotState =
  | 'idle' | 'greeting' | 'thinking' | 'explaining' | 'hinting'
  | 'correct' | 'try-again' | 'achievement' | 'warning' | 'offline'
  | 'error' | 'rest' | 'exam-hidden'

export type TutorMode =
  | 'explain_simple' | 'explain_deep' | 'hinglish' | 'marathi'
  | 'exam_answer' | 'short_notes' | 'create_mcqs' | 'ask_me'
  | 'conduct_viva' | 'hint_only' | 'check_answer' | 'debug_code'
  | 'compare_concepts' | 'generate_flashcards' | 'build_study_plan'
  | 'review_weak_topics' | 'summarise_material'

export interface User {
  id: string
  email: string
  name: string
  role: string
  status?: string | null
  avatar?: string | null
  institutionId?: string | null
  schemeId?: string | null
  semesterNumber?: number | null
  branch?: string | null
  departmentCode?: string | null
  departmentName?: string | null
  division?: string | null
  rollNumber?: string | null
  provider?: string | null
  profileComplete?: boolean | null
  assignedSubjects?: string | null
  isCR?: boolean | null
  assignedBy?: string | null
  assignedAt?: string | Date | null
  preferredLang: string
  examDate?: string | null
  dailyMins: number
  xp: number
  level: number
  streak: number
  lastActiveDate?: string | null
  onboarded: boolean
}

export interface Subject {
  id: string
  code: string
  name: string
  shortName?: string | null
  credits: number
  icon?: string | null
  accentColor: string
  mascotKey?: string | null
  description?: string | null
  units: Unit[]
}

export interface Unit {
  id: string
  number: number
  title: string
  description?: string | null
  weightage: number
  topics: Topic[]
  lessons?: Lesson[]
}

export interface Topic {
  id: string
  slug: string
  title: string
  description?: string | null
  difficulty: string
  examWeightage: number
  lessons?: Lesson[]
}

export interface Lesson {
  id: string
  title: string
  order: number
  durationMin: number
  learnContent?: string | null
  simplifyContent?: string | null
  visualiseContent?: string | null
  practiseContent?: string | null
  reviseContent?: string | null
  citations?: string | null
}

export interface Question {
  id: string
  type: string
  difficulty: string
  question: string
  options?: string | null
  correctAnswer?: string | null
  explanation?: string | null
  hint?: string | null
  marks: number
  negativeMark: number
  unitNumber?: number | null
  topicId?: string | null
  subjectId: string
}

export interface MasteryRecord {
  topicId: string
  score: number
  state: string
  evidenceCount: number
  confidence: number
  lastPractised?: string | null
  nextRevision?: string | null
}

export interface TutorSession {
  id: string
  title: string
  subjectId?: string | null
  unitNumber?: number | null
  topicId?: string | null
  mode: string
  language: string
  archived: boolean
  createdAt: string
  updatedAt: string
  messages: TutorMessage[]
}

export interface TutorMessage {
  id: string
  clientMessageId?: string | null
  role: string
  content: string
  mode?: string | null
  groundingStatus?: string | null
  citations?: string | null
  followUps?: string | null
  feedback?: string | null
}

export interface Achievement {
  id: string
  key: string
  name: string
  description: string
  icon: string
  category: string
  xpReward: number
}

// API response shapes
export interface ApiSuccess<T> { ok: true; data: T; requestId: string }
export interface ApiFailure { ok: false; error: { code: string; message: string; retryable: boolean }; requestId: string }
export type ApiResult<T> = ApiSuccess<T> | ApiFailure

export const TUTOR_MODES: { key: TutorMode; label: string; icon: string; desc: string }[] = [
  { key: 'explain_simple', label: 'Explain Simply', icon: 'Lightbulb', desc: 'Plain-English explanation' },
  { key: 'explain_deep', label: 'Learn Deeply', icon: 'GraduationCap', desc: 'In-depth concept breakdown' },
  { key: 'hinglish', label: 'Hinglish', icon: 'Languages', desc: 'Hindi + English mix' },
  { key: 'marathi', label: 'Marathi', icon: 'Languages', desc: 'मराठी मध्ये' },
  { key: 'exam_answer', label: 'Exam Answer', icon: 'FileText', desc: 'Exam-ready format' },
  { key: 'short_notes', label: 'Short Notes', icon: 'StickyNote', desc: 'Quick revision notes' },
  { key: 'create_mcqs', label: 'MCQ Generator', icon: 'ListChecks', desc: 'Generate practice MCQs' },
  { key: 'ask_me', label: 'Ask Me Questions', icon: 'HelpCircle', desc: 'Tutor quizzes you' },
  { key: 'conduct_viva', label: 'Viva', icon: 'Mic', desc: 'Oral exam practice' },
  { key: 'hint_only', label: 'Hint Only', icon: 'Key', desc: 'Just a hint, no answer' },
  { key: 'check_answer', label: 'Check My Answer', icon: 'CheckCircle', desc: 'Evaluate your answer' },
  { key: 'debug_code', label: 'Debug Code', icon: 'Bug', desc: 'Find code issues' },
  { key: 'compare_concepts', label: 'Compare Concepts', icon: 'GitCompare', desc: 'A vs B comparison' },
  { key: 'generate_flashcards', label: 'Flashcards', icon: 'Layers', desc: 'Generate flashcards' },
  { key: 'build_study_plan', label: 'Study Plan', icon: 'CalendarCheck', desc: 'Personalised plan' },
  { key: 'review_weak_topics', label: 'Weak Topic Review', icon: 'TrendingDown', desc: 'Focus on gaps' },
  { key: 'summarise_material', label: 'Summarise Material', icon: 'FileText', desc: 'Summarise approved notes' },
]

export const LEARNING_MODES: { key: LearningMode; label: string; icon: string; desc: string }[] = [
  { key: 'learn', label: 'Learn', icon: 'BookOpen', desc: 'Full structured lesson' },
  { key: 'simplify', label: 'Simplify', icon: 'Sparkles', desc: 'Simple English, Hinglish, analogy' },
  { key: 'visualise', label: 'Visualise', icon: 'Play', desc: 'Interactive animation' },
  { key: 'practise', label: 'Practise', icon: 'PenTool', desc: 'Guided questions' },
  { key: 'revise', label: 'Revise', icon: 'RotateCw', desc: 'Flashcards & short notes' },
]

export const SUBJECT_MASCOTS: Record<string, { name: string; role: string; color: string; accent: string }> = {
  byte: { name: 'Byte', role: 'Data Structures guide', color: '#06b6d4', accent: 'accent-byte' },
  coda: { name: 'Coda', role: 'C++ & coding companion', color: '#f59e0b', accent: 'accent-coda' },
  pico: { name: 'Pico', role: 'Microprocessors mentor', color: '#ec4899', accent: 'accent-pico' },
  nova: { name: 'Nova', role: 'Data Communication guide', color: '#10b981', accent: 'accent-nova' },
  leo: { name: 'LEO', role: 'Your learning companion', color: '#7c3aed', accent: 'accent-leo' },
}
