'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { TopBar as NewTopBar } from '@/components/layout/top-bar'
import { MascotToastContainer } from '@/components/mascots/mascot-toast'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { LernioLogoTile } from '@/components/brand/lernio-logo'
import { AppPageShell, shellVariantForView } from '@/components/app/app-page-shell'
import { Bot, BookOpen, CalendarCheck, Lock, LogIn, PenTool, PlayCircle, Search, User as UserIcon } from 'lucide-react'
// Dashboard stays eagerly loaded because it is the default landing view and drives LCP.
import { DashboardView } from '@/components/views/dashboard'
import { MotionPage } from '@/components/motion'
import { routeForView } from '@/lib/routes'
import type { Subject, User, ViewKey } from '@/lib/types'
import type { DashboardSnapshot } from '@/lib/app-bootstrap-types'
import {
  canonicalContinueLearningRoute,
  canonicalSemesterRouteForUser,
} from '@/features/learning/utils/canonical-learning-routes'

// Lazy-load every non-dashboard view so Recharts, the 3 lab simulators, the
// coding editor, react-markdown, etc. are split into per-view chunks and
// excluded from the initial dashboard bundle. Each shows a calm skeleton
// while its chunk streams in.
const ViewSkeleton = () => (
  <div className="flex items-center justify-center py-24" aria-busy="true" aria-live="polite">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
)
const lazy = <T extends { default: React.ComponentType }>(loader: () => Promise<T>) =>
  dynamic(loader, { ssr: false, loading: () => <ViewSkeleton /> })

const loadPracticeView = () => import('@/components/views/practice').then(m => ({ default: m.PracticeView }))
const loadTutorView = () => import('@/components/views/tutor').then(m => ({ default: m.TutorView }))
const loadLabsView = () => import('@/components/views/labs').then(m => ({ default: m.LabsView }))
const loadCodingView = () => import('@/components/views/coding').then(m => ({ default: m.CodingView }))
const loadExamsView = () => import('@/components/views/exams').then(m => ({ default: m.ExamsView }))
const loadRevisionView = () => import('@/components/views/revision').then(m => ({ default: m.RevisionView }))
const loadMaterialsView = () => import('@/components/views/materials').then(m => ({ default: m.MaterialsView }))
const loadPlannerView = () => import('@/components/views/planner').then(m => ({ default: m.PlannerView }))
const loadAnalyticsView = () => import('@/components/views/analytics').then(m => ({ default: m.AnalyticsView }))
const loadProfileView = () => import('@/components/views/profile').then(m => ({ default: m.ProfileView }))
const loadFocusTimerWidget = () => import('@/components/ui/focus-timer').then(m => ({ default: m.FocusTimerWidget }))

const PracticeView = lazy(loadPracticeView)
const TutorView = lazy(loadTutorView)
const LabsView = lazy(loadLabsView)
const CodingView = lazy(loadCodingView)
const ExamsView = lazy(loadExamsView)
const RevisionView = lazy(loadRevisionView)
const MaterialsView = lazy(loadMaterialsView)
const PlannerView = lazy(loadPlannerView)
const AnalyticsView = lazy(loadAnalyticsView)
const ProfileView = lazy(loadProfileView)
const FocusTimerWidget = dynamic(loadFocusTimerWidget, { ssr: false })

async function fetchJsonWithTimeout(url: string, timeoutMs = 1500) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    })
    return await response.json()
  } catch {
    return { ok: false }
  } finally {
    window.clearTimeout(timer)
  }
}

interface LearningAppProps {
  initialView?: ViewKey
  initialUser?: User | null
  initialSubjects?: Subject[]
  initialDashboard?: DashboardSnapshot | null
  children?: ReactNode
}

export function LearningApp({
  initialView = 'dashboard',
  initialUser = null,
  initialSubjects = [],
  initialDashboard = null,
  children,
}: LearningAppProps) {
  const [_bootstrapped] = useState(() => {
    useAppStore.setState({
      view: initialView,
      user: initialUser,
      subjects: initialSubjects,
      xp: initialUser?.xp ?? 0,
      streak: initialUser?.streak ?? 0,
    })
    return true
  })
  const { view, user, setUser, setSubjects, setMascot } = useAppStore()

  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useMenuState()

  useEffect(() => {
    useAppStore.setState({ view: initialView })
  }, [initialView])

  useEffect(() => {
    if (initialUser || initialSubjects.length > 0) return

    let mounted = true
    async function load() {
      const [userResult, subjectResult] = await Promise.allSettled([
        fetchJsonWithTimeout('/api/user'),
        fetchJsonWithTimeout('/api/academics'),
      ])
      if (!mounted) return

      if (userResult.status === 'fulfilled' && userResult.value.ok) {
        setUser(userResult.value.data)
        useAppStore.setState({ xp: userResult.value.data.xp, streak: userResult.value.data.streak })
      } else {
        setUser(null)
      }

      if (subjectResult.status === 'fulfilled' && subjectResult.value.ok) {
        setSubjects(subjectResult.value.data)
      }
      setLoading(false)
    }
    void load()
    return () => { mounted = false }
  }, [initialSubjects.length, initialUser, setUser, setSubjects])

  // Greet with LEO on first load
  useEffect(() => {
    if (!loading && user) {
      const greeted = sessionStorage.getItem('lernio-greeted')
      if (!greeted) {
        setMascot('leo', 'greeting', `Hi ${user.name.split(' ')[0]}! I'm LEO, your learning companion. Ready to continue where you left off?`)
        sessionStorage.setItem('lernio-greeted', '1')
      }
    }
  }, [loading, user, setMascot])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NewTopBar />
      <main className="app-main-container flex-1 min-w-0 flex flex-col">
        <div className="app-main-scroll">
          {children ? children : <ViewRouter view={view} initialDashboard={initialDashboard} />}
        </div>
        <Footer />
      </main>
      <MascotToastContainer />
      <FocusTimerWidget />
    </div>
  )
}

function StudentUtilityBar() {
  const router = useRouter()
  const {
    user,
    view,
    subjects,
    continueLearning,
    setLearnContext,
    setView,
  } = useAppStore()

  if (!user) return null

  const navigate = (nextView: ViewKey) => {
    setView(nextView)
    router.push(routeForView(nextView))
  }

  const resume = () => {
    const canonicalRoute = canonicalContinueLearningRoute(user, subjects, continueLearning)
      ?? canonicalSemesterRouteForUser(user)
    if (canonicalRoute) {
      router.push(canonicalRoute)
      return
    }

    if (continueLearning) {
      setLearnContext({
        subjectId: continueLearning.subjectId,
        unitNumber: continueLearning.unitNumber,
        topicId: continueLearning.topicId,
        lessonId: continueLearning.lessonId,
        mode: continueLearning.mode,
      })
    }
    navigate('learn')
  }

  const openSearch = () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: navigator.platform.includes('Mac'),
        ctrlKey: !navigator.platform.includes('Mac'),
      }),
    )
  }

  const items: Array<{
    label: string
    helper: string
    icon: typeof BookOpen
    view?: ViewKey
    action?: () => void
    cursor?: string
  }> = [
    {
      label: continueLearning ? 'Resume' : 'Start',
      helper: continueLearning?.topicTitle ?? 'Pick a lesson',
      icon: PlayCircle,
      action: resume,
    },
    { label: 'Practice', helper: '5 smart questions', icon: PenTool, view: 'practice' },
    { label: 'Ask LEO', helper: 'Explain a doubt', icon: Bot, view: 'tutor' },
    { label: 'Planner', helper: "Today's tasks", icon: CalendarCheck, view: 'planner' },
    { label: 'Search', helper: 'Quick command', icon: Search, action: openSearch, cursor: 'spark' },
  ]

  return (
    <div className="app-utility-bar" aria-label="Student quick actions">
      <div className="app-utility-bar__inner">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.view === view
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.action ?? (() => item.view && navigate(item.view))}
              className="app-utility-chip focus-ring"
              aria-current={active ? 'page' : undefined}
              data-active={active ? 'true' : undefined}
              data-cursor={item.cursor}
            >
              <span className="app-utility-chip__icon" aria-hidden="true">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold leading-tight">{item.label}</span>
                <span className="block max-w-28 truncate text-[10px] leading-tight text-muted-foreground">
                  {item.helper}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LockedFeatureView({ featureName }: { featureName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-6">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary to-violet-500 opacity-20 blur-lg animate-pulse" />
        <div className="relative h-16 w-16 rounded-full bg-card border border-primary/20 flex items-center justify-center text-primary shadow-soft">
          <Lock className="h-7 w-7" />
        </div>
      </div>
      <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent mb-2">
        {featureName} is Locked
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        This is a premium feature of Lernio AI. Sign in to access interactive study materials, coding challenges, your custom study planner, and LEO (your adaptive AI tutor).
      </p>
      <Link href="/sign-in">
        <Button className="gap-2 shadow-md hover:scale-105 transition-transform duration-200">
          <LogIn className="h-4 w-4" />
          Continue to Sign In
        </Button>
      </Link>
    </div>
  )
}

function ViewRouter({
  view,
  initialDashboard,
}: {
  view: ViewKey
  initialDashboard?: DashboardSnapshot | null
}) {
  const { user } = useAppStore()

  if (!user && view !== 'dashboard') {
    const titles: Record<ViewKey, string> = {
      dashboard: 'Dashboard', learn: 'Learn', practice: 'Practice', tutor: 'AI Tutor',
      labs: 'Interactive Labs', coding: 'Coding Lab', exams: 'Exams', revision: 'Smart Revision',
      materials: 'Materials', planner: 'Study Planner', analytics: 'Analytics', profile: 'Profile',
      community: 'Community', leaderboard: 'Leaderboard', achievements: 'Achievements',
      notifications: 'Notifications', attendance: 'Attendance', class: 'My Class',
    }
    return <MotionPage viewKey="locked"><LockedFeatureView featureName={titles[view] || 'This feature'} /></MotionPage>
  }

  let content: ReactNode
  switch (view) {
    case 'dashboard': content = <DashboardView initialData={initialDashboard} />; break
    case 'practice': content = <PracticeView />; break
    case 'tutor': content = <TutorView />; break
    case 'labs': content = <LabsView />; break
    case 'coding': content = <CodingView />; break
    case 'exams': content = <ExamsView />; break
    case 'revision': content = <RevisionView />; break
    case 'materials': content = <MaterialsView />; break
    case 'planner': content = <PlannerView />; break
    case 'analytics': content = <AnalyticsView />; break
    case 'profile': content = <ProfileView />; break
    default: content = <DashboardView />
  }
  return (
    <AppPageShell variant={shellVariantForView(view)}>
      <MotionPage viewKey={view}>{content}</MotionPage>
    </AppPageShell>
  )
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { view, xp, streak, user } = useAppStore()
  const titles: Record<ViewKey, string> = {
    dashboard: 'Dashboard', learn: 'Learn', practice: 'Practice', tutor: 'AI Tutor',
    labs: 'Interactive Labs', coding: 'Coding Lab', exams: 'Exams', revision: 'Smart Revision',
    materials: 'Materials', planner: 'Study Planner', analytics: 'Analytics', profile: 'Profile',
    community: 'Community', leaderboard: 'Leaderboard', achievements: 'Achievements',
    notifications: 'Notifications', attendance: 'Attendance', class: 'My Class',
  }
  const level = Math.floor((xp || user?.xp || 0) / 200) + 1
  const xpInLevel = (xp || user?.xp || 0) % 200
  const xpPct = (xpInLevel / 200) * 100
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 min-w-0 items-center justify-between gap-3 px-4 md:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onMenuClick} className="md:hidden p-1.5 rounded-md hover:bg-muted focus-ring" aria-label="Open menu">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <LernioLogoTile size="sm" className="md:hidden" />
          <h2 className="truncate text-base font-semibold">{titles[view]}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Streak flame pill */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning border border-warning/20">
            <svg className="h-3.5 w-3.5 flame-flicker" fill="currentColor" viewBox="0 0 20 20"><path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 2.286 1 3 .25.857.37 1.5.37 2.12z"/></svg>
            <span className="tabular-nums">{streak || user?.streak || 0}</span>
          </div>
          {/* XP pill with mini progress bar */}
          <div className="relative hidden lg:flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary overflow-hidden border border-primary/20">
            <div
              className="absolute inset-y-0 left-0 bg-primary/10"
              style={{ width: `${xpPct}%` }}
              aria-hidden
            />
            <svg className="h-3.5 w-3.5 relative" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/></svg>
            <span className="relative tabular-nums">{xp || user?.xp || 0} XP</span>
            <span className="relative text-meta text-primary/70 ml-0.5 hidden md:inline">L{level}</span>
          </div>
          {/* Avatar with primary ring (theme-token based) */}
          {user ? (
            <div className="relative ring-2 ring-primary/40 rounded-full">
              <div className="relative h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold border-2 border-background">
                {user.name.charAt(0)}
              </div>
            </div>
          ) : (
            <Link href="/sign-in">
              <Button size="sm" variant="outline" className="gap-1.5 h-8">
                <UserIcon className="h-3.5 w-3.5" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function useMenuState(): [boolean, (v: boolean) => void] {
  const open = useAppStore((s) => s.sidebarOpen)
  const setOpen = useAppStore((s) => s.setSidebarOpen)
  return [open, setOpen]
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background">
      <div className="relative">
        <LernioLogoTile size="lg" className="animate-pulse" />
        <div className="absolute -inset-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-bold text-primary">Lernio AI 2.0</h1>
        <p className="text-sm text-muted-foreground mt-1">Loading your learning platform...</p>
      </div>
    </div>
  )
}
