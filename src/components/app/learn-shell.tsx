'use client'

import type { ReactNode } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

/**
 * Lightweight shell for learn pages — no DB queries, no Zustand store,
 * no lazy-loaded views. Just the TopBar + content + footer.
 *
 * This replaces the heavy LearningApp wrapper which called getAppBootstrap()
 * (a DB query) on every page load, causing 2-3 second delays.
 */
export function LearnShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  )
}
