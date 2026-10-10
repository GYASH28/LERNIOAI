'use client'

import { useEffect } from 'react'

/**
 * Root error boundary: Next.js requires html/body here because the root
 * layout itself may fail (including ThemeProvider or font initialization).
 * Uses inline fallback styles so an app-wide CSS failure isn't a black page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Lernio root render failure:', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', background: '#faf9ff', color: '#201b2f', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <section style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>⚠️</p>
            <h1 style={{ fontSize: 24, margin: '0 0 12px' }}>Lernio couldn't load this page</h1>
            <p style={{ lineHeight: 1.6, color: '#625b70' }}>
              This is a temporary app error. Your saved lessons and progress are not deleted.
              Try loading the page again.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ border: 0, borderRadius: 10, background: '#6546ae', color: 'white', cursor: 'pointer', fontSize: 16, padding: '12px 24px', marginTop: 16 }}
            >
              Try again
            </button>
            <p style={{ marginTop: 18 }}>
              <a href="/" style={{ color: '#6546ae' }}>Go to Lernio home</a>
            </p>
            {error.digest ? <p style={{ fontSize: 12, color: '#777' }}>Error reference: {error.digest}</p> : null}
          </section>
        </main>
      </body>
    </html>
  )
}
