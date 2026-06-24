import type { AuthUser } from '@/lib/auth'
import type { Subject, User } from '@/lib/types'

const today = () => new Date().toISOString().slice(0, 10)

export const DEMO_AUTH_USER: AuthUser = {
  id: 'demo-user',
  email: 'student@lernio.ai',
  name: 'Demo Student',
  role: 'student',
  status: 'active',
  profileComplete: true,
}

export const DEMO_USER: User & {
  streakFreezes: number
  lastFreezeUsedDate: string | null
  createdAt: string
  updatedAt: string
} = {
  ...DEMO_AUTH_USER,
  avatar: null,
  institutionId: 'demo-institution',
  schemeId: 'demo-scheme',
  semesterNumber: 3,
  branch: 'Diploma in Computer Engineering & IoT',
  departmentCode: 'CIOT',
  departmentName: 'Computer Engineering & IoT',
  division: 'A',
  rollNumber: '254101',
  provider: 'demo',
  profileComplete: true,
  isCR: false,
  preferredLang: 'en',
  examDate: '2026-11-15',
  dailyMins: 120,
  xp: 420,
  level: 3,
  streak: 7,
  streakFreezes: 2,
  lastFreezeUsedDate: null,
  lastActiveDate: today(),
  onboarded: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function subject(
  id: string,
  code: string,
  name: string,
  accentColor: string,
  mascotKey: string,
  units: Array<{ number: number; title: string; topics: string[] }>,
): Subject {
  return {
    id,
    code,
    name,
    shortName: code,
    credits: 4,
    icon: null,
    accentColor,
    mascotKey,
    description: `${name} core concepts and exam practice.`,
    units: units.map((unit) => ({
      id: `${id}-u${unit.number}`,
      number: unit.number,
      title: unit.title,
      description: null,
      weightage: 16,
      topics: unit.topics.map((title, index) => ({
        id: `${id}-u${unit.number}-t${index + 1}`,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        title,
        description: null,
        difficulty: index === 0 ? 'easy' : 'medium',
        examWeightage: 8,
      })),
      lessons: unit.topics.map((title, index) => ({
        id: `${id}-u${unit.number}-l${index + 1}`,
        title: `${title} Essentials`,
        order: index + 1,
        durationMin: 12,
        learnContent: JSON.stringify({
          summary: `${title} explained with exam-focused examples.`,
          sections: ['Concept', 'Worked example', 'Common mistakes'],
        }),
        simplifyContent: `Simple explanation for ${title}.`,
        visualiseContent: `Visual walkthrough for ${title}.`,
        practiseContent: `Practice prompts for ${title}.`,
        reviseContent: `Quick revision notes for ${title}.`,
        citations: null,
      })),
    })),
  }
}

export const DEMO_SUBJECTS: Subject[] = [
  subject('demo-ds', 'CS201', 'Data Structures', '#06b6d4', 'byte', [
    { number: 1, title: 'Foundations', topics: ['Data Structures Overview', 'Asymptotic Notation'] },
    { number: 2, title: 'Searching', topics: ['Linear Search', 'Binary Search'] },
    { number: 3, title: 'Sorting', topics: ['Bubble Sort', 'Merge Sort'] },
  ]),
  subject('demo-cpp', 'CS202', 'Object Oriented Programming with C++', '#f59e0b', 'coda', [
    { number: 1, title: 'Classes and Objects', topics: ['Class Design', 'Constructors'] },
    { number: 2, title: 'Inheritance', topics: ['Single Inheritance', 'Polymorphism'] },
  ]),
  subject('demo-mp', 'CS203', 'Microprocessor', '#ec4899', 'pico', [
    { number: 1, title: '8085 Basics', topics: ['Architecture', 'Instruction Cycle'] },
    { number: 2, title: 'Programming', topics: ['Addressing Modes', 'Assembly Programs'] },
  ]),
  subject('demo-dc', 'CS204', 'Data Communication', '#10b981', 'nova', [
    { number: 1, title: 'Signals', topics: ['Analog and Digital Signals', 'Transmission Media'] },
    { number: 2, title: 'Networks', topics: ['OSI Model', 'Error Detection'] },
  ]),
]

const demoTopic = DEMO_SUBJECTS[0].units[0].topics[0]
const demoSubject = DEMO_SUBJECTS[0]

export const DEMO_PROGRESS = {
  mastery: [
    {
      id: 'demo-mastery-1',
      topicId: demoTopic.id,
      score: 62,
      state: 'learning',
      evidenceCount: 4,
      confidence: 0.7,
      topic: { ...demoTopic, unit: { ...demoSubject.units[0], subject: demoSubject } },
    },
  ],
  lessonCompletions: [],
  questionAttempts: [],
  quizAttempts: [],
  studySessions: [],
}

export const DEMO_REVISION_DUE = {
  dueToday: [],
  overdue: [],
  upcoming: [],
  all: [],
}

export const DEMO_TASKS = [
  {
    id: 'demo-task-1',
    userId: DEMO_USER.id,
    title: 'Revise binary search dry run',
    description: null,
    type: 'revise',
    subjectId: demoSubject.id,
    topicId: demoSubject.units[1].topics[1].id,
    durationMins: 30,
    scheduledDate: today(),
    scheduledTime: '18:00',
    priority: 2,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
  },
]

export const DEMO_ACTIVITY = {
  xpByDay: [20, 35, 0, 60, 40, 80, 25],
  activeDays: Array.from({ length: 14 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i * 2)
    return date.toISOString().slice(0, 10)
  }),
  minutesToday: 35,
  dailyGoalMins: DEMO_USER.dailyMins,
}

export const DEMO_QUESTS = {
  date: today(),
  quests: [
    { key: 'lesson', label: 'Complete a Lesson', description: 'Finish any lesson', icon: 'book', xpReward: 25, current: 0, target: 1, unit: 'lesson', done: false },
    { key: 'practice', label: 'Practice 5 Questions', description: 'Attempt practice questions', icon: 'pen', xpReward: 30, current: 2, target: 5, unit: 'questions', done: false },
    { key: 'focus', label: 'Study 2h', description: 'Hit your daily focus goal', icon: 'clock', xpReward: 40, current: 35, target: DEMO_USER.dailyMins, unit: 'min', done: false },
    { key: 'revision', label: 'Review 5 Cards', description: 'Revise spaced-repetition cards', icon: 'rotate', xpReward: 25, current: 0, target: 5, unit: 'cards', done: false },
    { key: 'xp', label: 'Earn 144 XP', description: 'Reach today\'s XP target', icon: 'zap', xpReward: 50, current: 25, target: 144, unit: 'XP', done: false },
  ],
  completedCount: 0,
  totalXp: 0,
  correctToday: 0,
  minutesToday: DEMO_ACTIVITY.minutesToday,
  xpToday: 25,
  dailyGoalMins: DEMO_USER.dailyMins,
}

export const DEMO_ACHIEVEMENTS = {
  achievements: [
    {
      id: 'demo-ach-first-step',
      key: 'first_step',
      name: 'First Step',
      description: 'Complete your first lesson.',
      icon: 'Footprints',
      category: 'learning',
      xpReward: 50,
      earned: false,
    },
  ],
  earned: [],
  newlyEarned: [],
}

export const DEMO_FREEZE_STATUS = {
  freezes: DEMO_USER.streakFreezes,
  maxFreezes: 5,
  lastActiveDate: DEMO_USER.lastActiveDate,
  lastFreezeUsedDate: DEMO_USER.lastFreezeUsedDate,
  streak: DEMO_USER.streak,
  streakBroken: false,
  canUseFreeze: false,
  alreadyUsedToday: false,
}

export const DEMO_TUTOR_SESSIONS = []

export function isDemoMode(): boolean {
  return process.env.LERNIO_DEMO_MODE === 'true'
}
