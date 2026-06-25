import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MarketingSectionHeader } from './marketing-section'

const MODES = [
  {
    id: 'learn',
    name: 'Learn',
    desc: 'Read the full lesson, written for diploma students rather than copied from a textbook.',
    sample: 'A stack follows Last-In-First-Out order. The last element pushed is the first one popped.',
  },
  {
    id: 'simplify',
    name: 'Simplify',
    desc: 'The same idea in plain language, with a real-world analogy.',
    sample: 'Think of a stack of plates: you add to the top, and you take from the top.',
  },
  {
    id: 'visualise',
    name: 'Visualise',
    desc: 'A diagram or step-by-step trace so the abstract becomes concrete.',
    sample: 'push(10) -> [10], push(20) -> [10, 20], pop() -> returns 20.',
  },
  {
    id: 'practise',
    name: 'Practise',
    desc: 'Adaptive questions that target the exact sub-skill you are weak on.',
    sample: 'Q: What is the time complexity of push() on an array-backed stack? A: O(1) amortised.',
  },
  {
    id: 'revise',
    name: 'Revise',
    desc: 'Spaced-repetition cards scheduled by your performance. Weak topics return sooner.',
    sample: 'Card due today: Convert infix (A+B)*C to postfix. Answer: AB+C*.',
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
        <MarketingSectionHeader
          id="modes-heading"
          eyebrow="Five learning modes"
          title="One topic, five ways to actually understand it."
          description="Every published lesson supports five modes, so you can learn the way that works for you and switch modes as exams approach."
        />

        <Tabs defaultValue={MODES[0].id} className="mt-10 gap-5">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="flex h-auto min-h-12 w-max min-w-full justify-start">
              {MODES.map((mode) => (
                <TabsTrigger
                  key={mode.id}
                  value={mode.id}
                  className="min-h-11 flex-none px-4 text-sm"
                >
                  {mode.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            {MODES.map((mode) => (
              <TabsContent key={mode.id} value={mode.id} className="mt-0">
                <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground">
                      {mode.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {mode.desc}
                    </p>
                  </div>
                  <div className="min-h-36 rounded-xl border border-dashed border-border bg-muted/40 p-4">
                    <Badge variant="outline" className="mb-3 text-xs">
                      Sample - Stacks vs queues
                    </Badge>
                    <p className="font-mono text-sm leading-6 text-foreground">
                      {mode.sample}
                    </p>
                  </div>
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <p className="mt-8 text-sm text-muted-foreground">
          Five modes are available wherever a topic has a published lesson.
          Today, 11 of 64 Semester-3 topics are complete. The rest show a
          clear "No lesson yet" state.
        </p>
      </div>
    </section>
  )
}
