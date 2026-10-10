'use client'

import { useEffect } from 'react'

/**
 * One-way migration away from the old PWA worker. Older releases registered
 * /sw.js on every visit while the worker unregistered itself and reloaded
 * every open tab. That can cause infinite reloads and stale-bundle blank pages.
 *
 * Never register a new worker or reload from this component. Unregister
 * existing same-origin workers and drop their cached app assets.
 */
export function RegisterSW() {
  useEffect(() => {
    let cancelled = false
    async function retireOldWorkers() {
      try {
        if (!('serviceWorker' in navigator)) return
        const registrations = await navigator.serviceWorker.getRegistrations()
        if (cancelled) return
        await Promise.all(registrations.map((registration) => registration.unregister()))
        if (!('caches' in window)) return
        const keys = await caches.keys()
        if (cancelled) return
        await Promise.all(keys.map((key) => caches.delete(key)))
      } catch {
        // Browser privacy settings can disable workers/storage; the network
        // version of Lernio must still render normally.
      }
    }
    void retireOldWorkers()
    return () => { cancelled = true }
  }, [])
  return null
}
