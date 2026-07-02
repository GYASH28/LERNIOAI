import type { CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Hero3DLoader, KnowledgeCorePoster } from './hero-3d'

function revealStyle(index: number) {
  return { '--hero-reveal-index': index } as CSSProperties
}

export function Hero({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const primaryHref = isAuthenticated ? '/dashboard' : '/sign-up'
  const primaryLabel = isAuthenticated ? 'Open dashboard' : 'Start learning'

  return (
    <section
      className="landing-hero-section relative overflow-hidden border-b border-border"
      aria-labelledby="hero-heading"
      data-landing-hero
    >
      <div className="marketing-aurora landing-hero-aurora" aria-hidden="true" />
      <div className="marketing-grid-bg landing-hero-grid" aria-hidden="true" />
      <div className="landing-hero-paths" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="marketing-container relative z-10 grid min-h-[calc(100svh-4rem)] items-center gap-10 py-14 md:py-20 xl:grid-cols-[minmax(0,1.02fr)_minmax(30rem,0.98fr)] xl:gap-16">
        <div className="landing-hero-copy max-w-2xl">
          <p className="marketing-eyebrow" data-hero-reveal style={revealStyle(0)}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            CWIT academic intelligence OS
          </p>

          <h1
            id="hero-heading"
            className="landing-hero-title mt-4 max-w-[13ch] text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground text-balance sm:max-w-[15ch] sm:text-5xl xl:text-6xl"
            data-hero-reveal
            style={revealStyle(1)}
          >
            One Academic System. Every CWIT Semester.
          </h1>

          <p
            className="mt-5 max-w-xl text-lg leading-7 text-muted-foreground text-pretty"
            data-hero-reveal
            style={revealStyle(2)}
          >
            Lernio turns CWIT branches, semesters, subjects, resources, practice
            and LEO tutor support into one fast workspace that already knows what
            each student needs next.
          </p>

          <div
            className="mt-7 flex flex-col gap-3 sm:flex-row"
            data-hero-reveal
            style={revealStyle(3)}
          >
            <Button size="lg" asChild className="landing-primary-cta h-12 min-h-12 gap-1.5">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="landing-secondary-cta h-12 min-h-12"
            >
              <Link href="/#how-it-works">See how it works</Link>
            </Button>
          </div>

          <p
            className="mt-5 text-sm text-muted-foreground"
            data-hero-reveal
            style={revealStyle(4)}
          >
            Seeded CWIT catalogue · Role-aware dashboards · Grounded LEO tutor
          </p>
        </div>

        <div
          className="landing-hero-visual relative min-w-0 xl:min-w-[30rem]"
          data-hero-reveal
          style={revealStyle(2)}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Living knowledge system
            </span>
            <span className="landing-live-pill">
              <i aria-hidden="true" />
              Academic core online
            </span>
          </div>
          <KnowledgeCorePoster />
          <Hero3DLoader />
        </div>
      </div>

      <a className="landing-scroll-cue" href="#academic-os" aria-label="Explore the Lernio academic system">
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
        Explore the system
      </a>
    </section>
  )
}
