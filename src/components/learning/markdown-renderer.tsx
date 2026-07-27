'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="notes-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        code({ className, children, ...props }) {
          const isInline = !className && !String(children).includes('\n')
          if (isInline) return <code className={className} {...props}>{children}</code>
          return <pre className="notes-prose-pre"><code>{children}</code></pre>
        }
      }}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
