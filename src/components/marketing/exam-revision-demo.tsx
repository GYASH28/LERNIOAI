import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ArrowRight } from 'lucide-react'

const FLOW = [
  {
    label: 'Practice attempt',
    detail: 'You answer 10 adaptive questions on stacks.',
    value: '8 / 10',
  },
  {
    label: 'Weak topic detected',
    detail: 'Infix-to-postfix conversion missed twice.',
    value: 'Flagged',
  },
  {
    label: 'Revision scheduled',
    detail: 'A spaced-repetition card is added to your queue.',
    value: 'Due today',
  },
  {
    label: 'Exam readiness update',
    detail: 'CS201 readiness climbs as the card is cleared.',
    value: '+5%',
  },
] as const

export function ExamRevisionDemo() {
  return (
    <section
      id="exam-revision"
      className="marketing-section border-b border-border bg-muted/30"
      aria-labelledby="exam-heading"
    >
      <div className="marketing-container">
        <div className="max-w-2xl">
          <p className="marketing-eyebrow">Exam &amp; revision engine</p>
          <h2 id="exam-heading" className="marketing-h2 mt-3">
            From a missed question to a cleared exam.
          </h2>
          <p className="marketing-lede mt-4">
            Lernio closes the loop between practice and revision. When you miss
            a question, the topic enters your revision queue — and your exam
            readiness updates the moment you clear it.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {FLOW.map((step, i) => (
            <li key={step.label}>
              <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-muted-foreground/50">
                    STEP {i + 1}
                  </span>
                  {i === FLOW.length - 1 && (
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                  )}
                </div>
                <h3 className="mt-2 text-sm font-bold text-foreground">
                  {step.label}
                </h3>
                <p className="mt-2 flex-1 text-xs leading-5 text-muted-foreground">
                  {step.detail}
                </p>
                <Badge
                  variant={i === 1 ? 'destructive' : i === 3 ? 'secondary' : 'outline'}
                  className="mt-3 w-fit text-[0.625rem]"
                >
                  {step.value}
                </Badge>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          Values shown are demo data — your real numbers update live as you practise.
        </p>
      </div>
    </section>
  )
}
