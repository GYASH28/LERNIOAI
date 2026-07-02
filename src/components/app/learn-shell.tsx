import type { ReactNode } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

/**
 * Lightweight shell for learn pages.
 * TopBar and Footer are already 'use client' components,
 * so they can be imported directly without dynamic().
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
