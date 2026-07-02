import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { MarketingSectionHeader } from './marketing-section'

const FLOW = [
  {
    label: 'Practice attempt',
    detail: 'You answer 10 adaptive questions on stacks.',
    value: '8 / 10',
  },
  {
    label: 'Weak topic detected',
    detail: 'Infix-to-postfix conversion was missed twice.',
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
        <MarketingSectionHeader
          id="exam-heading"
          eyebrow="Exam and revision engine"
          title="From a missed question to a cleared exam."
          description="Lernio closes the loop between practice and revision. Missed topics enter your revision queue, and readiness updates when you clear them."
        />

        <ol className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {FLOW.map((step, i) => (
            <li key={step.label} className="relative min-w-0">
              {i < FLOW.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[calc(50%+1rem)] top-8 hidden h-px w-[calc(100%-2rem)] bg-gradient-to-r from-border to-transparent xl:block"
                />
              )}
              <div className="relative flex h-full flex-col rounded-2xl border border-border bg-card p-5">
                <div className="flex min-h-8 items-center justify-between gap-3">
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    STEP {i + 1}
                  </span>
                  {i === FLOW.length - 1 && (
                    <CheckCircle2
                      className="h-4 w-4 text-success"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <h3 className="mt-3 min-h-10 text-base font-bold leading-snug text-foreground">
                  {step.label}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  {step.detail}
                </p>
                <Badge
                  variant={
                    i === 1 ? 'destructive' : i === 3 ? 'secondary' : 'outline'
                  }
                  className="mt-4 w-fit text-xs"
                >
                  {step.value}
                </Badge>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Values shown are demo data. Your real numbers update live as you
          practise.
        </p>
      </div>
    </section>
  )
}
