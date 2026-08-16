'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'

export function PlannerActions({ hasPlan }: { hasPlan: boolean }) {
  const router = useRouter()
  const [intensity, setIntensity] = useState<'LIGHT' | 'BALANCED' | 'INTENSIVE'>('BALANCED')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intensity }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not generate plan.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate plan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(['LIGHT', 'BALANCED', 'INTENSIVE'] as const).map((item) => (
          <button key={item} type="button" onClick={() => setIntensity(item)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${intensity === item ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent'}`}>
            {item === 'LIGHT' ? 'Lighter' : item === 'BALANCED' ? 'Balanced' : 'Intensive'}
          </button>
        ))}
      </div>
      <button type="button" disabled={loading} onClick={generate} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : hasPlan ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        {hasPlan ? 'Regenerate 7-day plan' : 'Create my 7-day plan'}
      </button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )
}
