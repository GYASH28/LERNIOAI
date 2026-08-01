import type { ReactNode } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import {
  LearningWorkflowNav,
  type LearningWorkflowKey,
} from '@/components/app/learning-workflow-nav'
import { cn } from '@/lib/utils'

interface AuthenticatedPageShellProps {
  children: ReactNode
  current?: LearningWorkflowKey
  maxWidth?: '5xl' | '7xl' | 'full'
  showContinuityNav?: boolean
}

const widthClass = {
  '5xl': 'max-w-5xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-none',
} as const

/**
 * Shared shell for authenticated standalone pages.
 * It prevents every page from inventing its own header/footer spacing and keeps
 * the desktop learning loop connected without duplicating the mobile dock.
 */
export function AuthenticatedPageShell({
  children,
  current,
  maxWidth = '7xl',
  showContinuityNav = true,
}: AuthenticatedPageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopBar />
      {showContinuityNav && <LearningWorkflowNav current={current} />}
      <main className="min-w-0 flex-1 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className={cn('page-wipe mx-auto w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8', widthClass[maxWidth])}>
          {children}
        </div>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  )
}
