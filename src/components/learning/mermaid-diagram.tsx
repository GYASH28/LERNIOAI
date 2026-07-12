'use client'

import { useEffect, useRef, useState, memo } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

let mermaidLoadPromise: Promise<typeof import('mermaid').default> | null = null

async function loadMermaid() {
  if (!mermaidLoadPromise) {
    mermaidLoadPromise = import('mermaid').then((m) => {
      const mer = m.default
      mer.initialize({
        startOnLoad: false,
        theme: 'neutral',
        securityLevel: 'loose',
        fontFamily: 'inherit',
        flowchart: { curve: 'basis', htmlLabels: true },
        mindmap: { padding: 16 },
      })
      return mer
    })
  }
  return mermaidLoadPromise
}

let renderCounter = 0

export interface MermaidDiagramProps {
  /** Mermaid source (without the leading `graph TD` line included if present). */
  source: string
  title?: string
}

export const MermaidDiagram = memo(function MermaidDiagram({
  source,
  title,
}: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const idRef = useRef(`mermaid-${++renderCounter}`)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadMermaid()
      .then(async (mer) => {
        try {
          const cleaned = source.trim()
          const { svg: rendered } = await mer.render(idRef.current, cleaned)
          if (!cancelled) {
            setSvg(rendered)
            setLoading(false)
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Failed to render diagram')
            setLoading(false)
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load mermaid')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [source])

  if (loading) {
    return (
      <div className="mermaid-wrapper">
        {title && <div className="mermaid-wrapper__title">{title}</div>}
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Rendering diagram…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mermaid-wrapper">
        {title && <div className="mermaid-wrapper__title">{title}</div>}
        <div className="flex items-start gap-2 py-4 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Diagram error</p>
            <pre className="mt-1 text-xs whitespace-pre-wrap font-mono text-muted-foreground">{source}</pre>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mermaid-wrapper">
      {title && <div className="mermaid-wrapper__title">{title}</div>}
      <div dangerouslySetInnerHTML={{ __html: svg ?? '' }} />
    </div>
  )
})
