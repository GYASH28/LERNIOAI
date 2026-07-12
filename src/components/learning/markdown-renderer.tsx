'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { CodeBlock } from './code-block'

/**
 * Markdown renderer tuned for lesson notes theory.
 * - Supports GFM (tables, strikethrough, task lists)
 * - Allows raw HTML (for callouts via <div class="callout …">)
 * - Fenced code blocks use the syntax-highlighted CodeBlock
 */
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="notes-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !className && !String(children).includes('\n')
            if (isInline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }
            return (
              <CodeBlock
                code={String(children).replace(/\n$/, '')}
                language={match?.[1] ?? 'plaintext'}
                showLineNumbers={false}
                collapsible={true}
                collapseThreshold={20}
              />
            )
          },
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
