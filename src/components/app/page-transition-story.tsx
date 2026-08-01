'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LearningIllustration } from '@/components/engagement/learning-illustration'
import { engagementLineForRoute } from '@/lib/engagement-copy'

const TRANSITION_MS = 640

export function PageTransitionStory() {
  const pathname = usePathname() || '/'
  const previousPathRef = useRef(pathname)
  const timerRef = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [seed, setSeed] = useState(0)

  useEffect(() => {
    if (previousPathRef.current === pathname) return
    previousPathRef.current = pathname

    const reduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.motion === 'reduced' ||
      document.documentElement.dataset.motion === 'none' ||
      document.documentElement.dataset.lowPower === 'true'

    if (reduced) return

    setSeed((current) => current + 1)
    setVisible(true)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setVisible(false), TRANSITION_MS)

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [pathname])

  if (!visible) return null

  const copy = engagementLineForRoute(pathname, seed)

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[90] grid place-items-center overflow-hidden bg-background/94 px-5 backdrop-blur-xl"
      role="status"
      aria-live="polite"
      aria-label={`${copy.title}. ${copy.message}`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent motion-safe:animate-[transitionSweep_640ms_ease-out_both]" />
      <div className="absolute left-[8%] top-[12%] h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-[10%] right-[8%] h-36 w-36 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="grid w-full max-w-3xl items-center gap-4 rounded-[2rem] border border-border/70 bg-card/90 p-4 shadow-2xl shadow-primary/10 sm:grid-cols-[230px_minmax(0,1fr)] sm:p-6 motion-safe:animate-[transitionCard_640ms_cubic-bezier(.2,.8,.2,1)_both]">
        <div className="mx-auto w-full max-w-[230px]">
          <LearningIllustration variant="transition" animated className="drop-shadow-sm" />
        </div>
        <div className="text-center sm:text-left">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Moving with your context</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{copy.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.message}</p>
          {copy.joke && (
            <p className="mt-3 rounded-xl bg-muted/70 px-3 py-2 text-xs font-semibold text-foreground/80">
              {copy.joke}
            </p>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes transitionCard {
          0% { opacity: 0; transform: translateY(16px) scale(.985); }
          28% { opacity: 1; transform: translateY(0) scale(1); }
          78% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-8px) scale(1.01); }
        }
        @keyframes transitionSweep {
          0% { opacity: 0; transform: translateX(-70%); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: translateX(70%); }
        }
        @keyframes learningFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  )
}
