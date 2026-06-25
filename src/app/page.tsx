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
  UsersRound,
  Zap,
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
  ['Adaptive study', 'Learn, simplify, visualise, practise, and revise diploma subjects.', BookOpenCheck],
  ['Planning', 'Tasks, exams, focus sessions, revision due dates, and progress signals.', CalendarDays],
  ['Campus profiles', 'Students, CRs, teachers, coordinators, and admins keep the right department context.', UsersRound],
  ['Access control', 'Credentials, Google sign-in, invite codes, and disabled-account protection.', ShieldCheck],
] as const

const heroStats = [
  ['Programmes', String(CWIT_PROGRAMMES.length)],
  ['Departments', String(CWIT_DEPARTMENTS.length)],
  ['Roles', String(CAMPUS_ROLES.length)],
] as const

export default async function LandingPage() {
  const session = process.env.LERNIO_DEMO_MODE === 'true' ? { user: { id: 'demo-user' } } : await getServerSession(authOptions)
  const primaryHref = session?.user ? '/dashboard' : '/sign-up'

  return (
    <main className="min-h-screen overflow-hidden bg-[#090a11] text-white">
      <section className="relative min-h-[96dvh] overflow-hidden border-b border-white/10">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 76% 26%, rgba(229, 47, 151, 0.30), transparent 25%), radial-gradient(circle at 58% 62%, rgba(82, 79, 229, 0.34), transparent 24%), radial-gradient(circle at 18% 18%, rgba(47, 170, 154, 0.18), transparent 28%), linear-gradient(135deg, #07080d 0%, #11131d 52%, #08090f 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.65) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
          }}
        />
        <div aria-hidden="true" className="intro-pulse-glow absolute right-[7%] top-[17%] h-72 w-72 rounded-full bg-[#e5359a]/30 blur-3xl" />
        <div aria-hidden="true" className="intro-pulse-glow absolute bottom-[12%] left-[18%] h-64 w-64 rounded-full bg-[#514ce5]/25 blur-3xl [animation-delay:900ms]" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#171820] shadow-[0_14px_34px_rgba(229,47,151,0.24)]">
              <img src="/brand/lernio-logo-mark.webp" alt="" className="block h-full w-full object-cover" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-black leading-none">Lernio</span>
              <span className="mt-1 block text-xs font-semibold text-white/54">CWIT academic workspace</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white/66 transition hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href={primaryHref}
              className="intro-shimmer inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-[#10111a] shadow-[0_16px_45px_rgba(229,47,151,0.28)] transition hover:-translate-y-0.5 hover:bg-[#f4f0ff]"
            >
              {session?.user ? 'Open dashboard' : 'Create profile'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[calc(96dvh-88px)] max-w-7xl gap-10 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8">
          <div>
            <p className="intro-reveal inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-bold text-[#ffc0e4] shadow-[inset_0_1px_rgba(255,255,255,0.12)] backdrop-blur">
              <Zap className="h-3.5 w-3.5" />
              Campus-ready learning workspace
            </p>
            <h1 className="intro-reveal intro-reveal-delay-1 mt-6 text-6xl font-black leading-[0.95] tracking-normal text-white sm:text-7xl lg:text-8xl">
              Lernio
            </h1>
            <p className="intro-reveal intro-reveal-delay-2 mt-6 max-w-3xl text-xl font-semibold leading-8 text-white/82">
              A luminous academic workspace for subjects, revision, exams, materials, focus analytics, and role-based campus access.
            </p>
            <p className="intro-reveal intro-reveal-delay-2 mt-4 max-w-2xl text-base leading-7 text-white/58">
              Students can create accounts directly. CR, teacher, coordinator, reviewer, moderator, and admin access is handled through approved invite codes.
            </p>
            <div className="intro-reveal intro-reveal-delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={primaryHref}
                className="intro-shimmer inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#514ce5] via-[#ad48df] to-[#e5359a] px-5 text-base font-black text-white shadow-[0_22px_60px_rgba(173,72,223,0.34)] transition hover:-translate-y-0.5"
              >
                {session?.user ? 'Open dashboard' : 'Create student profile'}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/8 px-5 text-base font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/12"
              >
                <LogIn className="h-5 w-5" />
                Sign in
              </Link>
            </div>

            <div className="intro-reveal intro-reveal-delay-3 mt-10 grid gap-3 sm:grid-cols-3">
              {heroStats.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/12 bg-white/8 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur">
                  <p className="text-sm font-semibold text-white/58">{label}</p>
                  <p className="mt-2 font-mono text-3xl font-black tabular-nums text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="intro-reveal intro-reveal-delay-2 relative lg:min-h-[620px]">
            <div aria-hidden="true" className="absolute left-8 top-10 h-[74%] w-[78%] rounded-[3rem] border border-white/10 bg-white/[0.035] shadow-[inset_0_1px_rgba(255,255,255,0.12)] backdrop-blur" />
            <div className="intro-float relative z-10 mx-auto max-w-[680px] overflow-hidden rounded-[2rem] border border-white/12 bg-[#11131d] p-3 shadow-[0_35px_120px_rgba(0,0,0,0.48)] sm:p-4">
              <img
                src="/brand/lernio-logo-full.webp"
                alt="Lernio logo with a glowing book and flame mark"
                className="block aspect-square w-full rounded-[1.5rem] object-contain"
              />
            </div>
            <div className="relative z-20 mx-auto mt-4 grid max-w-xl gap-3 rounded-[1.35rem] border border-white/14 bg-[#0d0f17]/78 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:-mt-6 sm:grid-cols-3">
              {[
                ['Readiness', '74%', 'exam signal'],
                ['Revision', '12', 'cards due'],
                ['Focus', '86m', 'today'],
              ].map(([label, value, hint]) => (
                <div key={label} className="rounded-2xl bg-white/8 p-3">
                  <p className="text-xs font-semibold text-white/50">{label}</p>
                  <p className="mt-1 font-mono text-2xl font-black tabular-nums">{value}</p>
                  <p className="text-xs text-[#ffc0e4]">{hint}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-b border-white/10 bg-[#0c0e15]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div className="intro-reveal">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-[#ff8fcb]">
              <Layers3 className="h-4 w-4" />
              Access flow
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-black tracking-normal text-white sm:text-4xl">
              The intro, profile, and dashboard now follow one path.
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {CAMPUS_WORKFLOW.map(([title, text], index) => (
              <article key={title} className="intro-card-lift rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur">
                <p className="font-mono text-sm font-black text-[#ff8fcb]">0{index + 1}</p>
                <h3 className="mt-3 font-black text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/58">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-[#ff8fcb]">
              <CheckCircle2 className="h-4 w-4" />
              Workspace
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-normal text-white sm:text-4xl">
              Daily academic work without separate tools.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-white/58">
            The main product stays focused on repeated student and faculty workflows: study, prepare, review, and coordinate.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featureCards.map(([title, text, Icon]) => (
            <article key={title} className="intro-card-lift rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e5359a]/14 text-[#ff8fcb]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-black text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/58">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {CAMPUS_MODULE_AREAS.map((area) => (
            <article key={area.label} className="intro-card-lift rounded-2xl border border-white/10 bg-white/[0.045] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#ff8fcb]">{area.label}</p>
              <h3 className="mt-3 text-xl font-black text-white">{area.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/58">{area.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0c0e15]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-18 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-[#ff8fcb]">
              <Building2 className="h-4 w-4" />
              CWIT programmes
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-normal text-white sm:text-4xl">
              Department context is part of account setup.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/58">
              Student profiles can store programme, semester, division, and roll number. Staff profiles carry department context for future workflows.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CWIT_PROGRAMMES.map((programme) => (
              <article key={programme.programmeCode} className="intro-card-lift rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                <p className="font-mono text-xs font-black text-[#ff8fcb]">{programme.programmeCode}</p>
                <h3 className="mt-2 font-black text-white">{programme.departmentName}</h3>
                <p className="mt-1 text-sm leading-6 text-white/58">{programme.programmeName}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-[#ff8fcb]">
              <NotebookTabs className="h-4 w-4" />
              Role hierarchy
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-normal text-white sm:text-4xl">
              Access levels match college operations.
            </h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {CAMPUS_ROLES.map((role) => (
            <article key={role} className="intro-card-lift rounded-2xl border border-white/10 bg-white/[0.055] p-4">
              <p className="font-black text-white">{CAMPUS_ROLE_LABELS[role]}</p>
              <p className="mt-2 text-sm leading-6 text-white/58">{CAMPUS_ROLE_DESCRIPTIONS[role]}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
