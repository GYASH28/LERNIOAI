'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/app-store'
import { Mascot } from '@/components/mascots/mascot'
import { usePrefs } from '@/components/theme-provider'
import { playAchievementSound } from '@/lib/sound'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export function MascotToastContainer() {
  const { mascotToasts, dismissMascotToast } = useAppStore()
  const { pref } = usePrefs()

  // When an achievement toast appears and the user has sound enabled, play a
  // short synthesised arpeggio (Web Audio API — no audio files needed).
  useEffect(() => {
    if (!pref.soundEnabled) return
    const hasAchievement = mascotToasts.some(
      (t) => t.state === 'achievement' || t.state === 'correct',
    )
    if (hasAchievement) {
      playAchievementSound(true)
    }
  }, [mascotToasts, pref.soundEnabled])

  if (!pref.mascotsEnabled) return null

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence
        // In low-power mode, disable the enter/exit spring to skip the
        // Framer Motion animation cost (audit: "Low-power mode disables Framer Motion").
        initial={pref.lowPower ? false : undefined}
      >
        {mascotToasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={
              pref.lowPower
                ? { duration: 0 }
                : { type: 'spring', stiffness: 300, damping: 25 }
            }
            className="pointer-events-auto flex items-start gap-3 rounded-2xl bg-card border border-border shadow-lg p-3 pr-8 relative"
          >
            <Mascot mascot={toast.mascot} state={toast.state} size={48} animated={!pref.reducedMotion} />
            <div className="flex-1 pt-1">
              <p className="text-sm leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissMascotToast(toast.id)}
              className="absolute top-2 right-2 rounded-full hover:bg-muted p-0.5"
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
