import Link from 'next/link'
import { Github } from 'lucide-react'
import { LernioLogoTile } from '@/components/brand/lernio-logo'

const PRODUCT_LINKS = [
  { label: 'Learn', href: '/learn' },
  { label: 'Practice', href: '/practice' },
  { label: 'AI Tutor', href: '/tutor' },
  { label: 'Labs', href: '/labs' },
  { label: 'Coding Lab', href: '/coding' },
  { label: 'Exams', href: '/exams' },
  { label: 'Revision', href: '/revision' },
  { label: 'Materials', href: '/materials' },
  { label: 'Planner', href: '/planner' },
  { label: 'Analytics', href: '/analytics' },
] as const

const COMPANY_LINKS = [
  { label: 'Support', href: '/support' },
  { label: 'Sign in', href: '/sign-in' },
  { label: 'Sign up', href: '/sign-up' },
] as const

const LEGAL_LINKS = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
] as const

export function PublicFooter() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="mt-auto border-t border-border bg-muted/30"
      role="contentinfo"
    >
      <div className="marketing-container py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2.5"
              aria-label="Lernio home"
            >
              <LernioLogoTile size="sm" />
              <span className="text-base font-extrabold tracking-tight text-foreground">
                Lernio
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              An adaptive learning workspace for diploma engineering students.
              Built for CWIT Pune.
            </p>
            <a
              href="https://github.com/GYASH28/LERNIOAI"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-9 min-h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              GitHub
            </a>
          </div>

          <nav aria-label="Product">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Product
            </h3>
            <ul className="mt-4 space-y-2">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-9 items-center text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Account
            </h3>
            <ul className="mt-4 space-y-2">
              {COMPANY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-9 items-center text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Legal
            </h3>
            <ul className="mt-4 space-y-2">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-9 items-center text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            © {year} Lernio AI · Cusrow Wadia Institute of Technology (CWIT),
            Pune · G Scheme 2023
          </p>
        </div>
      </div>
    </footer>
  )
}
