'use client'
import { useState, useRef, useMemo } from 'react'
import { Check, Copy, ChevronDown } from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import java from 'highlight.js/lib/languages/java'
import python from 'highlight.js/lib/languages/python'
import javascript from 'highlight.js/lib/languages/javascript'
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
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('json', json)
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('text', plaintext)

const ALIASES: Record<string, string> = {
  c:'c',cpp:'cpp','c++':'cpp',java:'java',python:'python',py:'python',
  javascript:'javascript',js:'javascript',ts:'javascript',typescript:'javascript',
  sql:'sql',json:'json',plaintext:'plaintext',text:'plaintext','':'plaintext',
}

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  showLineNumbers?: boolean
  /**
   * When true and the code exceeds `collapseThreshold` lines, the block
   * renders collapsed with a "Show N lines" toggle. Defaults to false
   * (never collapse) so existing call sites keep their current behaviour.
   */
  collapsible?: boolean
  /** Line count above which a collapsible block is initially collapsed. */
  collapseThreshold?: number
}

export function CodeBlock({
  code,
  language = 'plaintext',
  title,
  showLineNumbers = true,
  collapsible = false,
  collapseThreshold = 15,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)
  const lang = ALIASES[language.toLowerCase()] ?? 'plaintext'

  const lineCount = useMemo(() => code.split('\n').length, [code])
  const shouldCollapse = collapsible && !expanded && lineCount > collapseThreshold
  const visibleCode = shouldCollapse
    ? code.split('\n').slice(0, collapseThreshold).join('\n')
    : code

  let highlighted: string
  try { highlighted = hljs.highlight(visibleCode, { language: lang }).value }
  catch { highlighted = visibleCode.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(()=>setCopied(false),1500) } catch {} }
  return (
    <div
      className="group relative rounded-lg border overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-inset)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div
        className="flex items-center justify-between border-b px-3 py-1.5"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--surface-2)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          </span>
          {title && (
            <span
              className="ml-2 truncate text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {title}
            </span>
          )}
          <span
            className="ml-auto text-[10px] font-mono uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            {lang}
          </span>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors"
          style={{ color: 'var(--text-muted)' }}
          type="button"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-3)'
            e.currentTarget.style.color = 'var(--text-default)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" style={{ color: 'var(--success)' }} />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre
          ref={preRef}
          className="m-0 p-3 text-xs leading-relaxed font-mono"
          style={{ color: 'var(--text-default)' }}
        >
          <code
            className={`hljs language-${lang} block`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
      {shouldCollapse && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-1.5 border-t px-3 py-2 text-xs font-medium transition-colors"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--surface-2)',
            color: 'var(--text-muted)',
          }}
          aria-expanded={false}
          aria-label={`Show all ${lineCount} lines`}
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Show all {lineCount} lines
        </button>
      )}
    </div>
  )
}
