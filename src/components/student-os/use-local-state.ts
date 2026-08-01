'use client'

import { useEffect, useState } from 'react'

export function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored) setValue(JSON.parse(stored) as T)
    } catch {
      // Ignore malformed or unavailable local storage and keep the safe fallback.
    } finally {
      setHydrated(true)
    }
  }, [key])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // The experience remains usable when storage is blocked or full.
    }
  }, [hydrated, key, value])

  return [value, setValue, hydrated] as const
}
