import Link from 'next/link'
import { getServerSession } from 'next-auth'
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Layers3,
  LogIn,
  NotebookTabs,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { authOptions } from '@/lib/auth'
import {
  CAMPUS_MODULE_AREAS,
  CAMPUS_ROLE_DESCRIPTIONS,
  CAMPUS_ROLE_LABELS,
  CAMPUS_ROLES,
  CAMPUS_WORKFLOW,
  CWIT_PROGRAMMES,
} from '@/lib/campus-auth'
import { CWIT_DEPARTMENTS } from '@/lib/cwit-departments'

const featureCards = [
  ['Adaptive learning', 'Learn, simplify, visualise, practise, and revise diploma subjects with structured guidance.', BookOpenCheck],
  ['Academic planning', 'Planner, exams, progress, revision, materials, and focus analytics live in one workspace.', CalendarDays],
  ['Campus profiles', 'Students, CRs, teachers, coordinators, and admins carry the right department context.', UsersRound],
  ['Reliable access', 'Credentials, Google sign-in, one-time elevated role invites, and disabled-account protection.', ShieldCheck],
] as const

export default async function LandingPage() {
  const session = process.env.LERNIO_DEMO_MODE === 'true' ? { user: { id: 'demo-user' } } : await getServerSession(authOptions)
  const primaryHref = session?.user ? '/dashboard' : '/sign-up'

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative border-b border-border/70">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.12),transparent_30%)]" />
        <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-lg shadow-primary/20">
              L
            </span>
            <span>
              <span className="block text-lg font-black tracking-tight">Lernio</span>
              <span className="block text-xs font-semibold text-muted-foreground">CWIT academic workspace</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Login
            </Link>
            <Link
              href={primaryHref}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
            >
              {session?.user ? 'Open dashboard' : 'Get started'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </header>

        <div className="mx-auto grid min-h-[calc(100dvh-80px)] w-full max-w-7xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Complete academic workspace
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-normal text-foreground sm:text-6xl lg:text-7xl">
              Lernio for Cusrow Wadia Institute of Technology
            </h1>
            <p className="mt-5 max-w-3xl text-xl font-semibold leading-8 text-foreground/86">
              A normal college-ready doorway before login: department profiles, role-based access, study tools, exams, materials, and progress in one place.
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Students can create profiles directly. CR, teacher, coordinator, and admin access can be controlled through one-time role invites, matching the CampusMate hierarchy while staying native to Lernio.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={primaryHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/20 transition hover:bg-primary/90"
              >
                {session?.user ? 'Open dashboard' : 'Create student profile'}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 text-base font-semibold transition hover:bg-muted"
              >
                <LogIn className="h-5 w-5" />
                Login
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-border bg-card/88 p-4 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
              <div className="rounded-[1.5rem] border border-border bg-background p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Today</p>
                    <p className="text-xl font-black">Student command center</p>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <GraduationCap className="h-6 w-6" />
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Readiness', '74%', 'exam signal'],
                    ['Pending tasks', '3', 'due soon'],
                    ['Revision', '12', 'cards today'],
                    ['Departments', String(CWIT_DEPARTMENTS.length), 'CWIT mapped'],
                  ].map(([label, value, hint]) => (
                    <div key={label} className="rounded-2xl border border-border bg-muted/35 p-4">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="mt-2 text-3xl font-black">{value}</p>
                      <p className="mt-1 text-xs font-bold text-primary">{hint}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-border bg-muted/35 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold">CWIT departments</p>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      Official list
                    </span>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    {CWIT_DEPARTMENTS.slice(0, 6).map((department) => (
                      <p key={department.code} className="truncate">
                        {department.name}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Layers3 className="h-3.5 w-3.5" />
              CampusMate-style flow
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-normal">
              Login is only one part of the campus system.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Lernio now starts with an introduction page, then moves users into signup, login, profile completion, and the right dashboard based on role and profile state.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {CAMPUS_WORKFLOW.map(([title, text], index) => (
              <div key={title} className="rounded-3xl border border-border bg-card p-5">
                <p className="text-3xl font-black text-primary/25">0{index + 1}</p>
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Platform areas
        </div>
        <h2 className="mt-4 text-3xl font-black tracking-normal sm:text-4xl">
          Built for students, faculty, and departments.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featureCards.map(([title, text, Icon]) => (
            <article key={title} className="rounded-3xl border border-border bg-card p-5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {CAMPUS_MODULE_AREAS.map((area) => (
            <article key={area.label} className="rounded-3xl border border-border bg-card p-5">
              <p className="text-xs font-bold text-primary">{area.label}</p>
              <h3 className="mt-3 text-xl font-black">{area.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{area.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Building2 className="h-3.5 w-3.5" />
              Departments
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-normal sm:text-4xl">
              CWIT departments are part of the account flow.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Student profiles are tied to a programme, semester, division, and roll number. Teacher and coordinator profiles carry department context for future academic workflows.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {CWIT_PROGRAMMES.map((programme) => (
              <article key={programme.programmeCode} className="rounded-3xl border border-border bg-card p-4">
                <p className="text-xs font-bold text-primary">{programme.programmeCode}</p>
                <h3 className="mt-2 font-black">{programme.departmentName}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{programme.programmeName}</p>
                {programme.intake ? (
                  <p className="mt-3 text-xs font-semibold text-muted-foreground">
                    Intake {programme.intake}{programme.intakeNote ? ` (${programme.intakeNote})` : ''}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-border bg-card p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <NotebookTabs className="h-3.5 w-3.5" />
                Role hierarchy
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-normal">
                Access levels match a real college.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {CAMPUS_ROLES.map((role) => (
                <article key={role} className="rounded-2xl border border-border bg-muted/35 p-4">
                  <p className="text-sm font-black">{CAMPUS_ROLE_LABELS[role]}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{CAMPUS_ROLE_DESCRIPTIONS[role]}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
