import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function FinalCTA({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const primaryHref = isAuthenticated ? '/dashboard' : '/sign-up'
  const primaryLabel = isAuthenticated ? 'Open dashboard' : 'Start learning'

  return (
    <section
      className="marketing-section border-b border-border"
      aria-labelledby="final-cta-heading"
    >
      <div className="marketing-container max-w-3xl text-center">
        <h2 id="final-cta-heading" className="marketing-h2">
          Start learning today.
        </h2>
        <p className="marketing-lede mt-4 mx-auto">
          Create a free account, pick your programme, and start with the very
          first lesson. No credit card, no invite code, no setup.
        </p>
        <div className="mt-7 flex justify-center">
          <Button size="lg" asChild className="h-12 min-h-12 gap-1.5">
            <Link href={primaryHref}>
              {primaryLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
