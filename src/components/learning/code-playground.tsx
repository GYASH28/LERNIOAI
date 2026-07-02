'use client'

import { useState } from 'react'
import { Play, Terminal, Code2 } from 'lucide-react'

/**
 * Simple code playground for programming lessons.
 * Uses the existing Judge0 code runner integration.
 */
export function CodePlayground({ language = 'c', initialCode = '' }: { language?: string; initialCode?: string }) {
  const [code, setCode] = useState(initialCode || `#include <stdio.h>\n\nint main() {\n    printf("Hello, Lernio!\\n");\n    return 0;\n}`)
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)

  const runCode = async () => {
    setRunning(true)
    setOutput('Running...')
    try {
      const res = await fetch('/api/coding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      })
      const data = await res.json()
      setOutput(data?.output || data?.error || 'No output')
    } catch (e) {
      setOutput('Error: Could not run code. Make sure the code runner is configured.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2"><Code2 className="h-4 w-4 text-green-500" /><span className="text-xs font-semibold uppercase text-muted-foreground">{language}</span></div>
        <button onClick={runCode} disabled={running} className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
          <Play className="h-3 w-3" />{running ? 'Running...' : 'Run'}
        </button>
      </div>
      <textarea value={code} onChange={e => setCode(e.target.value)} rows={8} className="w-full bg-zinc-900 p-3 font-mono text-xs text-green-400 outline-none resize-y" spellCheck={false} />
      {output && (
        <div className="border-t border-border bg-zinc-900 p-3">
          <div className="flex items-center gap-1.5 mb-1"><Terminal className="h-3 w-3 text-muted-foreground" /><span className="text-[10px] font-semibold uppercase text-muted-foreground">Output</span></div>
          <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono">{output}</pre>
        </div>
      )}
    </div>
  )
}
