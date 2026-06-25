import { BookOpen, GraduationCap, PenTool, RotateCw } from 'lucide-react'
import { MarketingSectionHeader } from './marketing-section'

const STEPS = [
  {
    n: 1,
    title: 'Choose a subject and topic',
    body: 'Start from the curriculum rail. Data Structures, OOP with C++, Microprocessors, and Data Communication map to real units.',
    Icon: BookOpen,
  },
  {
    n: 2,
    title: 'Learn using the mode that fits',
    body: 'Read the lesson, simplify it, visualise it, practise it, or revise it from one workspace.',
    Icon: GraduationCap,
  },
  {
    n: 3,
    title: 'Practise and reveal weak areas',
    body: 'Adaptive practice surfaces the topics you struggle with. Correctness is scored on the server.',
    Icon: PenTool,
  },
  {
    n: 4,
    title: 'Revise automatically before exams',
    body: 'Weak topics enter a spaced-repetition queue. Exam readiness updates as you clear revision cards.',
    Icon: RotateCw,
  },
] as const

export function LearningPath() {
  return (
    <section
      id="how-it-works"
      className="marketing-section relative border-b border-border"
      aria-labelledby="how-heading"
    >
      <div className="marketing-container">
        <MarketingSectionHeader
          id="how-heading"
          eyebrow="How Lernio works"
          title="One workspace, four clear steps."
          description="No more jumping between notes apps, question banks, and random videos. Lernio follows the natural flow of studying for a diploma exam."
        />

        <ol
          className="marketing-card-grid marketing-card-grid--four mt-12"
          data-marketing-grid="how"
        >
          {STEPS.map((step, i) => (
            <li key={step.n} className="relative min-w-0">
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="marketing-desktop-connector absolute left-[4.75rem] top-7 h-px w-[calc(100%-4.75rem)] bg-gradient-to-r from-border to-transparent"
                />
              )}
              <div className="relative flex h-full flex-col rounded-2xl border border-border bg-card p-5">
                <div className="flex min-h-14 items-center gap-3">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-border">
                    <step.Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-2xl font-extrabold text-muted-foreground/40">
                    0{step.n}
                  </span>
                </div>
                <h3 className="mt-4 min-h-[2.75rem] text-base font-bold leading-snug text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
