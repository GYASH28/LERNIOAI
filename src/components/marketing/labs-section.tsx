import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Code2, Cpu, Network, Boxes, Info } from 'lucide-react'

const LABS = [
  {
    title: 'Data Structures',
    desc: 'Visualise stacks, queues, linked lists, trees and graphs. Step through operations one frame at a time.',
    Icon: Boxes,
  },
  {
    title: 'Microprocessor',
    desc: 'Trace registers, flags and instruction cycles for the 8085. See how each instruction changes state.',
    Icon: Cpu,
  },
  {
    title: 'Data Communication',
    desc: 'Walk through encoding, framing and error-detection with interactive signal diagrams.',
    Icon: Network,
  },
  {
    title: 'Coding Lab',
    desc: 'A C++ syntax playground with real challenge prompts. Local syntax checks only — no fake runs.',
    Icon: Code2,
  },
] as const

export function LabsSection() {
  return (
    <section
      id="labs"
      className="marketing-section border-b border-border"
      aria-labelledby="labs-heading"
    >
      <div className="marketing-container">
        <div className="max-w-2xl">
          <p className="marketing-eyebrow">Interactive labs &amp; coding</p>
          <h2 id="labs-heading" className="marketing-h2 mt-3">
            See it work, not just read about it.
          </h2>
          <p className="marketing-lede mt-4">
            Three visual labs and a C++ coding playground — built for the exact
            subjects diploma students struggle with most.
          </p>
        </div>

        <div
          className="marketing-card-grid marketing-card-grid--four mt-10"
          data-marketing-grid="labs"
        >
          {LABS.map((lab) => (
            <article
              key={lab.title}
              className="flex flex-col rounded-2xl border border-border bg-card p-5"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-border">
                <lab.Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-foreground">
                {lab.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                {lab.desc}
              </p>
            </article>
          ))}
        </div>

        {/* Honest limitation callout */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <div className="text-sm leading-6 text-foreground">
            <strong>Coding Lab honesty:</strong> C++ execution is not yet a
            production compiler. The Coding Lab is a syntax-learning playground
            today — it performs local syntax checks (brace matching,{' '}
            <code className="font-mono text-xs">int main()</code>,{' '}
            <code className="font-mono text-xs">return 0;</code>) and never
            claims to compile or run your code. A real isolated runner is on
            the roadmap.
          </div>
        </div>

        <div className="mt-6">
          <Button variant="outline" asChild className="gap-1.5">
            <Link href="/coding">
              Open the Coding Lab
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
