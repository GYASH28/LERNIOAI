'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

const SHORTCUTS = [
  { keys: '⌘ K', description: 'Open command palette' },
  { keys: '/', description: 'Quick search (open palette)' },
  { keys: 'G D', description: 'Go to Dashboard' },
  { keys: 'G L', description: 'Go to Learn' },
  { keys: 'G T', description: 'Go to AI Tutor' },
  { keys: 'G P', description: 'Go to Practice' },
  { keys: 'G M', description: 'Go to Materials' },
  { keys: '?', description: 'Show this help' },
  { keys: 'Esc', description: 'Close dialogs' },
]

export function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false)
  const router = useRouter()
  const [gPressed, setGPressed] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      // ? to show help
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setShowHelp(!showHelp)
        return
      }

      // Micro-improvement: `/` opens the command palette (global quick search).
      // This matches GitHub/Slack/Linear convention — power users expect it.
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        // Re-dispatch as Cmd/Ctrl+K so the CommandPalette listener picks it up.
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'k',
            metaKey: navigator.platform.includes('Mac'),
            ctrlKey: !navigator.platform.includes('Mac'),
            bubbles: true,
          }),
        )
        return
      }

      // Escape to close
      if (e.key === 'Escape') {
        setShowHelp(false)
        setGPressed(false)
        return
      }

      // G then letter for navigation
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !gPressed) {
        setGPressed(true)
        setTimeout(() => setGPressed(false), 1000)
        return
      }

      if (gPressed) {
        switch (e.key) {
          case 'd': router.push('/dashboard'); break
          case 'l': router.push('/learn'); break
          case 't': router.push('/tutor'); break
          case 'p': router.push('/practice'); break
          case 'm': router.push('/materials'); break
          case 'a': router.push('/analytics'); break
        }
        setGPressed(false)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router, gPressed, showHelp])

  if (!showHelp) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
      <div className="w-full max-w-md rounded-xl border border-border bg-popover p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Keyboard Shortcuts</h2>
          <button onClick={() => setShowHelp(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(s => (
            <div key={s.keys} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <kbd className="rounded border border-border bg-muted px-2 py-1 text-xs font-mono font-bold">{s.keys}</kbd>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground text-center">Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">?</kbd> anytime to see this again</p>
      </div>
    </div>
  )
}
