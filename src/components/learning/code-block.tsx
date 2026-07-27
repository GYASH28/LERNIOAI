'use client'
import { useState, useRef } from 'react'
import { Check, Copy } from 'lucide-react'
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

export function CodeBlock({ code, language='plaintext', title, showLineNumbers=true }: {
  code: string; language?: string; title?: string; showLineNumbers?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const lang = ALIASES[language.toLowerCase()] ?? 'plaintext'
  let highlighted: string
  try { highlighted = hljs.highlight(code, { language: lang }).value }
  catch { highlighted = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(()=>setCopied(false),1500) } catch {} }
  return (
    <div className="group relative rounded-lg border border-zinc-700/50 bg-[#0d1117] overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-700/50 bg-zinc-800/50 px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500/70"/><span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70"/><span className="h-2.5 w-2.5 rounded-full bg-green-500/70"/></span>
          {title && <span className="ml-2 truncate text-xs font-medium text-zinc-300">{title}</span>}
          <span className="ml-auto text-[10px] font-mono uppercase text-zinc-500">{lang}</span>
        </div>
        <button onClick={copy} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-100 transition-colors" type="button">
          {copied ? <><Check className="h-3 w-3 text-green-400"/>Copied</> : <><Copy className="h-3 w-3"/>Copy</>}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="m-0 p-3 text-xs leading-relaxed font-mono">
          <code className={`hljs language-${lang} block`} dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  )
}
