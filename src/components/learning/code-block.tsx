'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, Copy, Expand, Shrink } from 'lucide-react'
import hljs from 'highlight.js/lib/core'

// Register only the languages we care about (keeps the bundle small).
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import java from 'highlight.js/lib/languages/java'
import python from 'highlight.js/lib/languages/python'
import javascript from 'highlight.js/lib/languages/javascript'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import json from 'highlight.js/lib/languages/json'
import plaintext from 'highlight.js/lib/languages/plaintext'

hljs.registerLanguage('c', c)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c++', cpp)
hljs.registerLanguage('java', java)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('json', json)
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('text', plaintext)

const LANGUAGE_ALIASES: Record<string, string> = {
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cc: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  java: 'java',
  python: 'python',
  py: 'python',
  javascript: 'javascript',
  js: 'javascript',
  ts: 'javascript',
  typescript: 'javascript',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  sql: 'sql',
  json: 'json',
  plaintext: 'plaintext',
  text: 'plaintext',
  '': 'plaintext',
}

export interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  /** Show line numbers. Default true. */
  showLineNumbers?: boolean
  /** Allow expand/collapse for long code. Default true. */
  collapsible?: boolean
  /** Lines beyond this are hidden until expanded. Default 18. */
  collapseThreshold?: number
  className?: string
}

export function CodeBlock({
  code,
  language = 'plaintext',
  title,
  showLineNumbers = true,
  collapsible = true,
  collapseThreshold = 18,
  className = '',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const ref = useRef<HTMLElement>(null)

  const lang = LANGUAGE_ALIASES[language.toLowerCase()] ?? 'plaintext'
  const lines = code.split('\n')
  const isLong = lines.length > collapseThreshold
  const visibleLines = !collapsible || expanded || !isLong
    ? lines
    : lines.slice(0, collapseThreshold)

  // Highlight the visible portion as a single block.
  const highlighted = (() => {
    try {
      const codeToHighlight = visibleLines.join('\n')
      return hljs.highlight(codeToHighlight, { language: lang }).value
    } catch {
      return visibleLines.map((l) => escapeHtml(l)).join('\n')
    }
  })()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div
      className={`group relative rounded-lg border border-zinc-700/50 bg-[#0d1117] overflow-hidden ${className}`}
      data-codeblock=""
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-zinc-700/50 bg-zinc-800/50 px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {/* Traffic lights */}
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          </span>
          {title && (
            <span className="ml-2 truncate text-xs font-medium text-zinc-300">{title}</span>
          )}
          <span className="ml-auto text-[10px] font-mono uppercase text-zinc-500">{lang}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-100 transition-colors"
          aria-label="Copy code"
          type="button"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>

      {/* Code body */}
      <div className="relative overflow-x-auto">
        <pre className="m-0 p-3 text-xs leading-relaxed font-mono">
          <code
            ref={ref}
            className={`hljs language-${lang} block`}
            dangerouslySetInnerHTML={{
              __html: showLineNumbers
                ? withLineNumbers(highlighted, visibleLines.length, lines.length - collapseThreshold)
                : highlighted,
            }}
          />
        </pre>
        {collapsible && isLong && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0d1117] to-transparent" />
        )}
      </div>

      {/* Expand / collapse footer */}
      {collapsible && isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-zinc-700/50 bg-zinc-800/30 py-1.5 text-[11px] font-medium text-zinc-400 hover:bg-zinc-700/40 hover:text-zinc-100 transition-colors"
          type="button"
        >
          {expanded ? (
            <>
              <Shrink className="h-3 w-3" /> Show less
            </>
          ) : (
            <>
              <Expand className="h-3 w-3" /> Show all {lines.length} lines
            </>
          )}
        </button>
      )}
    </div>
  )
}

function withLineNumbers(highlightedHtml: string, visibleCount: number, hiddenCount: number): string {
  // Inject line-number spans. Each line is wrapped in a flex row.
  const lines = highlightedHtml.split('\n')
  return lines
    .map(
      (line, i) =>
        `<span class="hljs-ln-row"><span class="hljs-ln-num">${i + 1}</span><span class="hljs-ln-code">${line || ' '}</span></span>`,
    )
    .join('\n')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
