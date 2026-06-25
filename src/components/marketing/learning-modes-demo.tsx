import { Badge } from '@/components/ui/badge'

const MODES = [
  {
    name: 'Learn',
    desc: 'Read the full lesson, written for diploma students — not copied from a textbook.',
    sample: 'A stack follows Last-In-First-Out order. The last element pushed is the first one popped.',
  },
  {
    name: 'Simplify',
    desc: 'The same idea in plain language, with a real-world analogy.',
    sample: 'Think of a stack of plates: you add to the top, and you take from the top.',
  },
  {
    name: 'Visualise',
    desc: 'A diagram or step-by-step trace so the abstract becomes concrete.',
    sample: 'push(10) → [10] · push(20) → [10, 20] · pop() → returns 20, leaves [10].',
  },
  {
    name: 'Practise',
    desc: 'Adaptive questions that target the exact sub-skill you are weak on.',
    sample: 'Q: What is the time complexity of push() on a stack backed by an array? · A: O(1) amortised.',
  },
  {
    name: 'Revise',
    desc: 'Spaced-repetition cards scheduled by your performance — weak topics return sooner.',
    sample: 'Card due today: "Convert infix (A+B)*C to postfix." · Answer: "AB+C*"',
  },
] as const

export function LearningModesDemo() {
  return (
    <section
      id="subjects"
      className="marketing-section border-b border-border bg-muted/30"
      aria-labelledby="modes-heading"
    >
      <div className="marketing-container">
        <div className="max-w-2xl">
          <p className="marketing-eyebrow">Five learning modes</p>
          <h2 id="modes-heading" className="marketing-h2 mt-3">
            One topic, five ways to actually understand it.
          </h2>
          <p className="marketing-lede mt-4">
            Every published lesson supports five modes — so you can learn the
            way that works for you, then switch modes as exams approach.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MODES.map((mode) => (
            <article
              key={mode.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-5"
            >
              <h3 className="text-base font-bold text-foreground">{mode.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {mode.desc}
              </p>
              <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-3">
                <Badge variant="outline" className="mb-2 text-[0.625rem]">
                  Sample · Stacks vs Queues
                </Badge>
                <p className="font-mono text-xs leading-5 text-foreground">
                  {mode.sample}
                </p>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Five modes are available wherever a topic has a published lesson.
          Today, 11 of 64 Semester-3 topics are complete — the rest show an
          honest “No lesson yet” state.
        </p>
      </div>
    </section>
  )
}
