'use client'

import Link from 'next/link'
import { Bot } from 'lucide-react'
import { usePathname } from 'next/navigation'

/**
 * Floating "Ask LEO" button visible on mobile while reading lessons.
 * Links to the AI tutor with the current subject context.
 */
export function FloatingLeoButton({ subjectCode }: { subjectCode?: string }) {
  const pathname = usePathname()

  // Only show on lesson pages on mobile
  if (!pathname.includes('/lesson/')) return null

  const href = subjectCode ? `/tutor?subject=${subjectCode}` : '/tutor'

  return (
    <Link
      href={href}
      className="fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform hover:scale-110 md:hidden"
      style={{ bottom: 'max(5rem, env(safe-area-inset-bottom))' }}
      aria-label="Ask LEO - AI Tutor"
    >
      <Bot className="h-6 w-6" />
      <span aria-hidden="true" className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white">
        AI
      </span>
    </Link>
  )
}
