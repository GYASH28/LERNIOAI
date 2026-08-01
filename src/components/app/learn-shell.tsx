import type { ReactNode } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { LearningWorkflowNav } from '@/components/app/learning-workflow-nav'

/**
 * Single owner for Learn navigation chrome.
 * Child routes render content only; they must not mount another TopBar,
 * Footer or mobile dock.
 */
export function LearnShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopBar />
      <LearningWorkflowNav current="learn" />
      <main className="min-w-0 flex-1 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  )
}
