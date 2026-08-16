'use client'

import { useEffect } from 'react'
import { usePrefs } from '@/components/theme-provider'

const LIGHT_THEME_COLOR = '#f7f8fc'
const DARK_THEME_COLOR = '#070b14'

function resolvedDark(appearance: 'light' | 'dark' | 'system') {
  if (appearance === 'dark') return true
  if (appearance === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function syncBrowserChrome(appearance: 'light' | 'dark' | 'system') {
  const dark = resolvedDark(appearance)
  const root = document.documentElement
  root.style.colorScheme = dark ? 'dark' : 'light'

  let meta = document.querySelector<HTMLMetaElement>('meta[data-lernio-theme-color]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.dataset.lernioThemeColor = 'true'
    document.head.appendChild(meta)
  }
  meta.content = dark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR
}

/** Keeps native controls, scrollbars, and mobile browser chrome in sync when
 * the user changes Lernio appearance independently of the OS preference. */
export function ThemeBrowserChromeSync() {
  const { pref } = usePrefs()

  useEffect(() => {
    syncBrowserChrome(pref.appearance)

    if (pref.appearance !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => syncBrowserChrome('system')
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [pref.appearance])

  return null
}
