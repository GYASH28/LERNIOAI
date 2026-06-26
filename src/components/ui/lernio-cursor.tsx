'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type CursorMode = 'hidden' | 'default' | 'hover' | 'press' | 'clock' | 'native'

interface CursorRipple {
  id: number
  x: number
  y: number
}

const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  '[role="button"]',
  'summary',
  '[data-cursor]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const NATIVE_CURSOR_SELECTOR = [
  'input:not([type="checkbox"]):not([type="radio"])',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[data-native-cursor="true"]',
].join(',')

function supportsCustomCursor() {
  return (
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    document.documentElement.dataset.motion !== 'none' &&
    document.documentElement.dataset.lowPower !== 'true'
  )
}

function cursorModeForTarget(target: EventTarget | null): CursorMode {
  if (!(target instanceof Element)) return 'default'
  if (target.closest(NATIVE_CURSOR_SELECTOR)) return 'native'

  const cursorHint = target.closest<HTMLElement>('[data-cursor]')?.dataset.cursor
  if (cursorHint === 'clock' || cursorHint === 'hourglass') return 'clock'
  if (target.closest(INTERACTIVE_SELECTOR)) return 'hover'
  return 'default'
}

export function LernioCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef<CursorMode>('hidden')
  const [enabled, setEnabled] = useState(false)
  const [mode, setMode] = useState<CursorMode>('hidden')
  const [ripples, setRipples] = useState<CursorRipple[]>([])

  useEffect(() => {
    const update = () => setEnabled(supportsCustomCursor())
    update()

    const finePointer = window.matchMedia('(pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    finePointer.addEventListener('change', update)
    reducedMotion.addEventListener('change', update)

    return () => {
      finePointer.removeEventListener('change', update)
      reducedMotion.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (!enabled) {
      root.classList.remove('lernio-custom-cursor')
      root.removeAttribute('data-lernio-cursor-mode')
      setMode('hidden')
      modeRef.current = 'hidden'
      return
    }

    root.classList.add('lernio-custom-cursor')

    const setCursorMode = (nextMode: CursorMode) => {
      if (modeRef.current === nextMode) return
      modeRef.current = nextMode
      root.setAttribute('data-lernio-cursor-mode', nextMode)
      setMode(nextMode)
    }

    const moveCursor = (event: PointerEvent) => {
      cursorRef.current?.style.setProperty('--cursor-x', `${event.clientX}px`)
      cursorRef.current?.style.setProperty('--cursor-y', `${event.clientY}px`)
      setCursorMode(cursorModeForTarget(event.target))
    }

    const showCursor = () => {
      if (modeRef.current === 'hidden') setCursorMode('default')
    }

    const hideCursor = () => setCursorMode('hidden')

    const pressCursor = (event: PointerEvent) => {
      if (cursorModeForTarget(event.target) === 'native') return
      setCursorMode('press')
      const id = window.setTimeout(() => {
        setRipples((items) => items.filter((item) => item.id !== id))
      }, 620)
      setRipples((items) => [...items.slice(-4), { id, x: event.clientX, y: event.clientY }])
    }

    const releaseCursor = (event: PointerEvent) => {
      setCursorMode(cursorModeForTarget(event.target))
    }

    window.addEventListener('pointermove', moveCursor, { passive: true })
    window.addEventListener('pointerenter', showCursor)
    window.addEventListener('pointerleave', hideCursor)
    window.addEventListener('blur', hideCursor)
    window.addEventListener('pointerdown', pressCursor, { passive: true })
    window.addEventListener('pointerup', releaseCursor, { passive: true })

    return () => {
      root.classList.remove('lernio-custom-cursor')
      root.removeAttribute('data-lernio-cursor-mode')
      window.removeEventListener('pointermove', moveCursor)
      window.removeEventListener('pointerenter', showCursor)
      window.removeEventListener('pointerleave', hideCursor)
      window.removeEventListener('blur', hideCursor)
      window.removeEventListener('pointerdown', pressCursor)
      window.removeEventListener('pointerup', releaseCursor)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <>
      <div
        ref={cursorRef}
        className={cn('lernio-cursor', mode !== 'hidden' && mode !== 'native' && 'is-visible')}
        data-mode={mode}
        aria-hidden="true"
      >
        <span className="lernio-cursor__ping lernio-cursor__ping--one" />
        <span className="lernio-cursor__ping lernio-cursor__ping--two" />
        <svg className="lernio-cursor__glyph" width="34" height="34" viewBox="0 0 54 54" role="img">
          <path d="M8 5L47 36.5L26.8 38.3L17.5 52L8 5Z" fill="oklch(0.17 0.01 260)" />
          <path d="M8 5L26.8 38.3L17.5 52L8 5Z" fill="oklch(0.11 0.01 260)" />
          <path d="M8 5L47 36.5L29.8 35.4L8 5Z" fill="oklch(0.24 0.01 260)" />
        </svg>
        <span className="lernio-cursor__spark lernio-cursor__spark--a" />
        <span className="lernio-cursor__spark lernio-cursor__spark--b" />
        <span className="lernio-cursor__clock" />
      </div>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="lernio-cursor-ripple"
          style={{ left: ripple.x, top: ripple.y }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}
