import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductPreview } from './product-preview'

export function Hero({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const primaryHref = isAuthenticated ? '/dashboard' : '/sign-up'
  const primaryLabel = isAuthenticated ? 'Open dashboard' : 'Start learning'

  return (
    <section
      className="relative overflow-hidden border-b border-border"
      aria-labelledby="hero-heading"
    >
      <div className="marketing-aurora" aria-hidden="true" />
      <div className="marketing-grid-bg" aria-hidden="true" />

      <div className="marketing-container relative z-10 grid items-center gap-10 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* Left: copy + CTAs */}
        <div className="max-w-2xl">
          <p className="marketing-eyebrow">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            For diploma students · CWIT Pune
          </p>

          <h1
            id="hero-heading"
            className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Understand faster. Practise smarter. Walk into exams prepared.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-7 text-muted-foreground">
            Lernio helps diploma students understand difficult topics, practise
            intelligently, revise weak areas, and prepare for exams — from one
            personalised learning workspace.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild className="h-12 min-h-12 gap-1.5">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-12 min-h-12"
            >
              <Link href="/#how-it-works">See how it works</Link>
            </Button>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            Free for students · Server-scored practice · Grounded AI tutor
          </p>
        </div>

        {/* Right: interactive product preview */}
        <div className="relative">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Interactive product preview
            </span>
          </div>
          <ProductPreview />
        </div>
      </div>
    </section>
  )
}
