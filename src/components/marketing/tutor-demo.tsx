import { Badge } from '@/components/ui/badge'
import { BookOpen, Bot, MessageCircle } from 'lucide-react'

export function TutorDemo() {
  return (
    <section
      id="ai-tutor"
      className="marketing-section border-b border-border"
      aria-labelledby="tutor-heading"
    >
      <div className="marketing-container grid gap-12 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
        <div className="max-w-xl">
          <p className="marketing-eyebrow">
            <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            AI Tutor with sources
          </p>
          <h2 id="tutor-heading" className="marketing-h2 mt-3 text-balance">
            Ask a question. Get a grounded answer.
          </h2>
          <p className="marketing-lede mt-4 text-pretty">
            The AI Tutor retrieves approved Lernio lessons, then answers with
            citations you can open. No fabricated sources and no grounded label
            without retrieved evidence.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Citations come from approved Lernio lessons, not the open web.</span>
            </li>
            <li className="flex items-start gap-2">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Ask follow-ups in the same session. Hinglish support is available where the lesson has it.</span>
            </li>
          </ul>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Bot className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 break-words text-sm font-semibold text-foreground">
                AI Tutor - CS201 - Trees
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              Demo preview
            </Badge>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="ml-auto max-w-[85%] rounded-lg rounded-br-sm border border-border bg-muted/40 p-3 text-sm text-foreground">
              Why is recursion useful for tree traversals?
            </div>

            <div className="max-w-[88%] rounded-lg rounded-bl-sm border border-primary/30 bg-primary/5 p-3 text-sm leading-6 text-foreground">
              <p>
                Recursion mirrors the self-similar structure of a tree: each
                subtree looks like a smaller tree. A pre-order traversal visits
                the root, then recursively visits each child, which matches how
                the call stack naturally unwinds.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1 text-xs">
                  <BookOpen className="h-3 w-3" aria-hidden="true" />
                  CS201 - Trees - Lesson 4 - Section 2
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Grounded in an approved Lernio lesson
                </span>
              </div>
            </div>

            <div className="ml-auto max-w-[85%] rounded-lg rounded-br-sm border border-border bg-muted/40 p-3 text-sm text-foreground">
              Can you show me the same traversal iteratively?
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
