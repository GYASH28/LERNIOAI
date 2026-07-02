import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'

const TopBar = dynamic(() => import('@/components/layout/top-bar').then(m => ({ default: m.TopBar })), { ssr: false })
const Footer = dynamic(() => import('@/components/layout/footer').then(m => ({ default: m.Footer })), { ssr: false })

/**
 * Lightweight shell for learn pages.
 * Uses dynamic imports with ssr: false to avoid prerendering issues
 * with client components that use Zustand/next-auth at build time.
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
