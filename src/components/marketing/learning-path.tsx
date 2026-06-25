import { BookOpen, GraduationCap, PenTool, RotateCw } from 'lucide-react'

const STEPS = [
  {
    n: 1,
    title: 'Choose a subject and topic',
    body: 'Start from the curriculum rail — Data Structures, OOP with C++, Microprocessors, or Data Communication. Every topic maps to a real unit.',
    Icon: BookOpen,
  },
  {
    n: 2,
    title: 'Learn using the mode that fits',
    body: 'Read the lesson, simplify it, visualise it, practise it, or revise it — five learning modes, one workspace.',
    Icon: GraduationCap,
  },
  {
    n: 3,
    title: 'Practise and reveal weak areas',
    body: 'Adaptive practice surfaces the topics you struggle with. Correctness is scored on the server, so XP cannot be forged.',
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
        <div className="max-w-2xl">
          <p className="marketing-eyebrow">How Lernio works</p>
          <h2 id="how-heading" className="marketing-h2 mt-3">
            One workspace, four clear steps.
          </h2>
          <p className="marketing-lede mt-4">
            No more jumping between notes apps, question banks, and random
            YouTube videos. Lernio follows the natural flow of studying for a
            diploma exam.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-4 md:gap-4">
          {STEPS.map((step, i) => (
            <li key={step.n} className="relative">
              {/* Connecting line on desktop */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[3.25rem] top-7 hidden h-px w-[calc(100%-3.25rem)] bg-gradient-to-r from-border to-transparent md:block"
                />
              )}
              <div className="relative rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-border">
                    <step.Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-2xl font-extrabold text-muted-foreground/40">
                    0{step.n}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">
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
