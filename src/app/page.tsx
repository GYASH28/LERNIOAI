import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BarChart3, BookOpen, Brain, CalendarCheck, CheckCircle2, RotateCw, Sparkles, Target } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { LernioLogoTile } from '@/components/brand/lernio-logo'

const SITE_URL = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://lernioai.vercel.app'

export const metadata: Metadata = {
  title: 'Lernio AI — Learning OS for Class 11, Class 12 & JEE',
  description: 'Learn concepts, practise questions, revise intelligently and know what to study next with an AI-powered learning OS for Class 11, Class 12 and JEE preparation.',
  alternates: { canonical: '/' },
}

const softwareApplicationLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Lernio AI',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  description: 'An AI-powered Learning OS for Class 11, Class 12 and JEE preparation.',
  url: SITE_URL,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  publisher: { '@type': 'Organization', name: 'Lernio AI' },
}

const features = [
  { icon: Brain, title: 'AI Tutor', text: 'Ask doubts in the context of the subject, chapter and concept you are studying.' },
  { icon: Target, title: 'Adaptive Practice', text: 'Practice by chapter, track mistakes and build topic mastery from real attempts.' },
  { icon: RotateCw, title: 'Smart Revision', text: 'Bring mistakes and due concepts back before they disappear from memory.' },
  { icon: CalendarCheck, title: 'Study Planner', text: 'Turn your class, weak subjects and available time into connected study tasks.' },
  { icon: BarChart3, title: 'Meaningful Analytics', text: 'See accuracy, speed and mastery only when there is real data behind the insight.' },
  { icon: BookOpen, title: 'Boards + JEE', text: 'Keep school learning and entrance preparation connected without mixing irrelevant tools.' },
]

export default async function LandingPage() {
  const user = await getCurrentUser().catch(() => null)
  const primaryHref = user ? '/dashboard' : '/sign-up'
  const primaryLabel = user ? 'Open Lernio' : 'Start learning'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationLd) }} />
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5"><LernioLogoTile className="h-8 w-8" /><span className="font-bold">Lernio AI</span></Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex"><a href="#how-it-works" className="hover:text-foreground">How it works</a><a href="#features" className="hover:text-foreground">Features</a><a href="#journey" className="hover:text-foreground">Student journey</a></nav>
          <div className="flex items-center gap-2">{!user && <Link href="/sign-in" className="hidden rounded-xl px-3 py-2 text-sm font-medium hover:bg-accent sm:inline-flex">Sign in</Link>}<Link href={primaryHref} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">{primaryLabel}<ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_45%)]" />
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:py-32">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> Your personal AI-powered Learning OS</div>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-[-0.04em] sm:text-6xl lg:text-7xl">Your entire Class 11, Class 12 &amp; JEE preparation. <span className="text-primary">Organized by AI.</span></h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">Learn concepts, solve questions, revise intelligently and understand exactly what to improve next — all inside one focused learning OS.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Link href={primaryHref} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{primaryLabel}<ArrowRight className="h-4 w-4" /></Link><a href="#how-it-works" className="inline-flex items-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-accent">Explore Lernio</a></div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> CBSE-first architecture</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Boards + JEE modes</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> No fake progress</span></div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-4 shadow-2xl shadow-primary/5 sm:p-6">
              <div className="rounded-2xl border border-border bg-background p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Today’s plan</p><h2 className="mt-2 text-2xl font-bold">Know what to study next.</h2><div className="mt-5 space-y-3">{[['Physics','Laws of Motion','35 min'],['Chemistry','Chemical Bonding practice','25 min'],['Mathematics','Quadratic Equations revision','20 min']].map(([subject,task,time]) => <div key={subject} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4"><div><p className="text-xs font-semibold text-primary">{subject}</p><p className="mt-1 text-sm font-medium">{task}</p></div><span className="text-xs text-muted-foreground">{time}</span></div>)}</div></div>
              <div className="mt-4 grid grid-cols-3 gap-3">{[['Practice','82%'],['Revision','12 due'],['Mastery','Improving']].map(([label,value]) => <div key={label} className="rounded-xl border border-border bg-background p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}</div>
              <p className="mt-3 text-[10px] leading-4 text-muted-foreground">Illustrative product preview. Signed-in analytics are generated only from the student’s actual activity.</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">One connected loop</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Learn → Practice → Analyze → Revise → Test → Improve.</h2><p className="mt-4 leading-7 text-muted-foreground">Lernio is designed around what happens after you study—not around selling a stack of disconnected courses.</p></div>
          <div className="mt-10 grid gap-3 md:grid-cols-3 lg:grid-cols-6">{['Learn','Practice','Analyze','Revise','Test','Improve'].map((item,index) => <div key={item} className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-semibold text-primary">0{index+1}</p><p className="mt-3 font-semibold">{item}</p></div>)}</div>
        </section>

        <section id="features" className="border-y border-border bg-muted/20"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Built around the student</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A learning system, not a coaching-site dashboard.</h2></div><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map((feature) => <article key={feature.title} className="rounded-2xl border border-border bg-card p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><feature.icon className="h-5 w-5 text-primary" /></div><h3 className="mt-5 text-lg font-semibold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p></article>)}</div></div></section>

        <section id="journey" className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8"><div className="grid gap-10 lg:grid-cols-2 lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Personalized from the first session</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Choose your class, stream and goal. Lernio removes the rest of the noise.</h2><p className="mt-4 leading-7 text-muted-foreground">A PCM student preparing for JEE gets Physics, Chemistry, Mathematics and entrance tools. A board-focused student gets a calmer school-first workspace. Irrelevant features stay out of the way.</p></div><div className="rounded-3xl border border-border bg-card p-6"><div className="space-y-3">{['Class 11 / Class 12 / Dropper','Board and stream','Boards / JEE Main / Advanced','Daily study target','Weak subjects'].map((item,index) => <div key={item} className="flex items-center gap-3 rounded-xl border border-border p-4"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index+1}</span><span className="text-sm font-medium">{item}</span></div>)}</div></div></div></section>

        <section className="border-t border-border"><div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-6"><h2 className="text-3xl font-bold tracking-tight sm:text-5xl">Stop guessing what to study next.</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">Build a workspace around your actual class, preparation goal and progress.</p><Link href={primaryHref} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{primaryLabel}<ArrowRight className="h-4 w-4" /></Link></div></section>
      </main>

      <footer className="border-t border-border"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><div className="flex items-center gap-2"><LernioLogoTile className="h-6 w-6" /><span className="font-semibold text-foreground">Lernio AI</span><span>· Learning OS for Class 11, 12 &amp; JEE</span></div><div className="flex gap-4"><Link href="/privacy" className="hover:text-foreground">Privacy</Link><Link href="/terms" className="hover:text-foreground">Terms</Link><Link href="/support" className="hover:text-foreground">Support</Link></div></div></footer>
    </div>
  )
}
