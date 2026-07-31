'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'

interface SyncMeta {
  updatedAt: string
  dirty: boolean
}

interface SyncedStateEnvelope<T> {
  version: 1
  updatedAt: string
  value: T
}

interface StateApiResponse<T> {
  ok?: boolean
  data?: SyncedStateEnvelope<T> | null
}

const SYNC_DEBOUNCE_MS = 900

/**
 * Local-first state with authenticated cloud reconciliation.
 *
 * The existing Student OS experiences remain instant and offline-friendly, while
 * signed-in students transparently receive the newest state on another device.
 * Failed or unavailable sync never blocks the page or deletes the local copy.
 */
export function useLocalState<T>(key: string, fallback: T) {
  const [value, setValueState] = useState<T>(fallback)
  const [hydrated, setHydrated] = useState(false)
  const [syncRevision, setSyncRevision] = useState(0)
  const [remoteRetry, setRemoteRetry] = useState(0)
  const valueRef = useRef(value)
  const localFoundRef = useRef(false)
  const dirtyRef = useRef(false)
  const remoteReadyRef = useRef(false)

  valueRef.current = value

  useEffect(() => {
    remoteReadyRef.current = false
    localFoundRef.current = false
    dirtyRef.current = false

    try {
      const stored = window.localStorage.getItem(key)
      if (stored !== null) {
        const parsed = JSON.parse(stored) as T
        valueRef.current = parsed
        setValueState(parsed)
        localFoundRef.current = true

        const existingMeta = readMeta(key)
        if (existingMeta) {
          dirtyRef.current = existingMeta.dirty
        } else {
          const migrationMeta = { updatedAt: new Date().toISOString(), dirty: true }
          writeMeta(key, migrationMeta)
          dirtyRef.current = true
        }
      }
    } catch {
      // Keep the safe fallback if local storage is unavailable or malformed.
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

  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    const controller = new AbortController()

    const reconcile = async () => {
      try {
        const response = await fetch(`/api/student-os/state?key=${encodeURIComponent(key)}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) return
        const payload = await response.json() as StateApiResponse<T>
        if (cancelled || !payload.ok) return

        const remote = payload.data ?? null
        const localMeta = readMeta(key)
        remoteReadyRef.current = true

        if (!remote) {
          if (localFoundRef.current) {
            markDirty(key)
            dirtyRef.current = true
            setSyncRevision((current) => current + 1)
          }
          return
        }

        // A local dirty flag represents a real unsynchronised edit and wins even
        // when the device clock is behind the server clock. This avoids losing
        // notebook or progress changes because of clock skew.
        const hasUnsynchronisedLocalEdit =
          localFoundRef.current && Boolean(localMeta?.dirty)

        if (hasUnsynchronisedLocalEdit) {
          dirtyRef.current = true
          setSyncRevision((current) => current + 1)
          return
        }

        valueRef.current = remote.value
        setValueState(remote.value)
        localFoundRef.current = true
        dirtyRef.current = false
        try {
          window.localStorage.setItem(key, JSON.stringify(remote.value))
        } catch {
          // Keep the in-memory server value even when storage is unavailable.
        }
        writeMeta(key, { updatedAt: remote.updatedAt, dirty: false })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Offline, unauthenticated and temporary server failures all fall back
        // to the local copy. The browser online event triggers another attempt.
      }
    }

    void reconcile()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [hydrated, key, remoteRetry])

  useEffect(() => {
    if (!hydrated || !remoteReadyRef.current || !dirtyRef.current) return

    const timer = window.setTimeout(() => {
      const requestMeta = readMeta(key)
      if (!requestMeta?.dirty) return
      const requestUpdatedAt = requestMeta.updatedAt
      const requestValue = valueRef.current

      void fetch('/api/student-os/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: requestValue }),
      })
        .then(async (response) => {
          if (!response.ok) return null
          return response.json() as Promise<StateApiResponse<T>>
        })
        .then((payload) => {
          const saved = payload?.data
          if (!payload?.ok || !saved) return

          const latestMeta = readMeta(key)
          if (!latestMeta || latestMeta.updatedAt !== requestUpdatedAt) return
          dirtyRef.current = false
          writeMeta(key, { updatedAt: saved.updatedAt, dirty: false })
        })
        .catch(() => {
          // Keep the dirty local value. It will retry when the user edits again
          // or when the browser returns online.
        })
    }, SYNC_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [hydrated, key, syncRevision, value])

  useEffect(() => {
    if (!hydrated) return
    const retry = () => setRemoteRetry((current) => current + 1)
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [hydrated])

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((nextValue) => {
    const updatedAt = new Date().toISOString()
    dirtyRef.current = true
    localFoundRef.current = true
    writeMeta(key, { updatedAt, dirty: true })
    setValueState(nextValue)
    setSyncRevision((current) => current + 1)
  }, [key])

  return [value, setValue, hydrated] as const
}

function metaKey(key: string) {
  return `${key}.sync.v1`
}

function readMeta(key: string): SyncMeta | null {
  try {
    const raw = window.localStorage.getItem(metaKey(key))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SyncMeta>
    if (
      typeof parsed.updatedAt !== 'string' ||
      Number.isNaN(Date.parse(parsed.updatedAt)) ||
      typeof parsed.dirty !== 'boolean'
    ) {
      return null
    }
    return { updatedAt: parsed.updatedAt, dirty: parsed.dirty }
  } catch {
    return null
  }
}

function writeMeta(key: string, meta: SyncMeta) {
  try {
    window.localStorage.setItem(metaKey(key), JSON.stringify(meta))
  } catch {
    // Sync metadata is optional. Local state remains the primary fallback.
  }
}

function markDirty(key: string) {
  const existing = readMeta(key)
  writeMeta(key, {
    updatedAt: existing?.updatedAt ?? new Date().toISOString(),
    dirty: true,
  })
}
