'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ViewKey, LearningMode, MascotKey, MascotState, User, Subject } from '@/lib/types'

interface ContinueLearning {
  subjectId: string
  subjectCode: string
  subjectName: string
  unitNumber: number
  topicId: string
  topicTitle: string
  lessonId: string
  mode: LearningMode
  scrollPos: number
  lastActive: string
}

interface MascotToast {
  id: string
  mascot: MascotKey
  state: MascotState
  message: string
}

interface AppState {
  view: ViewKey
  setView: (v: ViewKey) => void
  user: User | null
  setUser: (u: User | null) => void
  subjects: Subject[]
  setSubjects: (s: Subject[]) => void
  currentSubjectId: string | null
  currentUnitNumber: number | null
  currentTopicId: string | null
  currentLessonId: string | null
  currentMode: LearningMode
  setLearnContext: (ctx: {
    subjectId?: string | null
    unitNumber?: number | null
    topicId?: string | null
    lessonId?: string | null
    mode?: LearningMode
  }) => void
  continueLearning: ContinueLearning | null
  saveContinueLearning: (c: ContinueLearning) => void
  activeMascot: MascotKey
  mascotState: MascotState
  mascotMessage: string | null
  setMascot: (m: MascotKey, state?: MascotState, message?: string | null) => void
  mascotToasts: MascotToast[]
  pushMascotToast: (t: Omit<MascotToast, 'id'>) => void
  dismissMascotToast: (id: string) => void
  xp: number
  streak: number
  addXp: (n: number) => void
  sidebarOpen: boolean
  setSidebarOpen: (o: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'dashboard',
      setView: (v) => set({ view: v }),
      user: null,
      setUser: (u) =>
        set((state) => {
          const changedUser = state.user?.id !== u?.id
          return {
            user: u,
            xp: u?.xp ?? 0,
            streak: u?.streak ?? 0,
            ...(changedUser
              ? {
                  continueLearning: null,
                  currentSubjectId: null,
                  currentUnitNumber: null,
                  currentTopicId: null,
                  currentLessonId: null,
                  currentMode: 'learn' as LearningMode,
                }
              : {}),
          }
        }),
      subjects: [],
      setSubjects: (s) => set({ subjects: s }),
      currentSubjectId: null,
      currentUnitNumber: null,
      currentTopicId: null,
      currentLessonId: null,
      currentMode: 'learn',
      setLearnContext: (ctx) =>
        set((state) => ({
          currentSubjectId: ctx.subjectId !== undefined ? ctx.subjectId : state.currentSubjectId,
          currentUnitNumber: ctx.unitNumber !== undefined ? ctx.unitNumber : state.currentUnitNumber,
          currentTopicId: ctx.topicId !== undefined ? ctx.topicId : state.currentTopicId,
          currentLessonId: ctx.lessonId !== undefined ? ctx.lessonId : state.currentLessonId,
          currentMode: ctx.mode !== undefined ? ctx.mode : state.currentMode,
        })),
      continueLearning: null,
      saveContinueLearning: (c) => set({ continueLearning: c }),
      activeMascot: 'leo',
      mascotState: 'idle',
      mascotMessage: null,
      setMascot: (m, state, message) =>
        set({ activeMascot: m, mascotState: state ?? 'idle', mascotMessage: message ?? null }),
      mascotToasts: [],
      pushMascotToast: (t) => {
        const id = Math.random().toString(36).slice(2)
        set((s) => ({ mascotToasts: [...s.mascotToasts, { ...t, id }] }))
        setTimeout(() => { get().dismissMascotToast(id) }, 5000)
      },
      dismissMascotToast: (id) =>
        set((s) => ({ mascotToasts: s.mascotToasts.filter((t) => t.id !== id) })),
      xp: 0,
      streak: 0,
      addXp: (n) => set((s) => ({ xp: s.xp + n })),
      sidebarOpen: false,
      setSidebarOpen: (o) => set({ sidebarOpen: o }),
    }),
    {
      name: 'lernio-app-store',
      partialize: (s) => ({
        view: s.view,
      }),
    }
  )
)
