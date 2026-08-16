'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, BookOpen, Brain, Check, Loader2, Sparkles, Target } from 'lucide-react'
import type { ClassLevel, Stream, SubjectSlug, TargetExam } from '@/lib/academics/types'
import { defaultSubjectsForStream } from '@/lib/academics/types'

const studyGoals = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4+ hours' },
]

const subjectNames: Record<SubjectSlug, string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  mathematics: 'Mathematics',
  biology: 'Biology',
  english: 'English',
  'computer-science': 'Computer Science',
  'physical-education': 'Physical Education',
}

function Choice({ active, title, description, onClick }: { active: boolean; title: string; description?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${active ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-card hover:border-primary/40 hover:bg-accent/50'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{title}</p>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
          {active && <Check className="h-3.5 w-3.5" />}
        </span>
      </div>
    </button>
  )
}

export function OnboardingFlow({ firstName }: { firstName: string }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [classLevel, setClassLevel] = useState<ClassLevel>('11')
  const [targetExams, setTargetExams] = useState<TargetExam[]>(['BOARDS', 'JEE_MAIN'])
  const [stream, setStream] = useState<Stream>('PCM')
  const [dailyStudyGoal, setDailyStudyGoal] = useState(120)
  const [weakSubjects, setWeakSubjects] = useState<SubjectSlug[]>([])
  const [saving, setSaving] = useState(false)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState('')

  const subjects = useMemo(() => defaultSubjectsForStream(stream), [stream])
  const targetYear = classLevel === '11' ? 2028 : 2027
  const isPcm = stream === 'PCM' || stream === 'PCMB'

  const setPreparation = (mode: 'BOARDS' | 'JEE_MAIN' | 'JEE_ADVANCED' | 'BOARDS_JEE') => {
    if (mode === 'BOARDS') setTargetExams(['BOARDS'])
    if (mode === 'JEE_MAIN') setTargetExams(['JEE_MAIN'])
    if (mode === 'JEE_ADVANCED') setTargetExams(['JEE_MAIN', 'JEE_ADVANCED'])
    if (mode === 'BOARDS_JEE') setTargetExams(['BOARDS', 'JEE_MAIN', 'JEE_ADVANCED'])
  }

  const preparationMode = targetExams.includes('BOARDS') && targetExams.includes('JEE_MAIN')
    ? 'BOARDS_JEE'
    : targetExams.includes('JEE_ADVANCED')
      ? 'JEE_ADVANCED'
      : targetExams.includes('JEE_MAIN')
        ? 'JEE_MAIN'
        : 'BOARDS'

  async function finish() {
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board: 'CBSE',
          classLevel,
          stream,
          targetExams,
          targetYear,
          subjects,
          dailyStudyGoal,
          weakSubjects,
          preferredLearningStyle: 'balanced',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save your workspace.')

      setBuilding(true)
      setTimeout(() => router.replace('/dashboard'), 1300)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your workspace.')
      setSaving(false)
    }
  }

  if (building) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-8 w-8 animate-pulse text-primary" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">Building your Lernio…</h1>
          <div className="mx-auto mt-7 max-w-sm space-y-3 text-left text-sm">
            {['Setting up your subjects', 'Creating your study roadmap', 'Preparing your revision system', 'Personalizing practice'].map((label, index) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <Check className={`h-4 w-4 ${index < 3 ? 'text-emerald-500' : 'text-primary animate-pulse'}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  const steps = [
    <div key="class" className="space-y-3">
      <Choice active={classLevel === '11'} title="Class 11" description="Build foundations and stay ahead of your school syllabus." onClick={() => setClassLevel('11')} />
      <Choice active={classLevel === '12'} title="Class 12" description="Boards, entrance preparation and focused revision." onClick={() => setClassLevel('12')} />
      <Choice active={classLevel === 'DROPPER'} title="JEE Dropper" description="A focused PCM workspace for your next JEE attempt." onClick={() => { setClassLevel('DROPPER'); setStream('PCM'); setTargetExams(['JEE_MAIN', 'JEE_ADVANCED']) }} />
    </div>,
    <div key="goal" className="space-y-3">
      <Choice active={preparationMode === 'BOARDS'} title="School / Boards" onClick={() => setPreparation('BOARDS')} />
      <Choice active={preparationMode === 'JEE_MAIN'} title="JEE Main" onClick={() => setPreparation('JEE_MAIN')} />
      <Choice active={preparationMode === 'JEE_ADVANCED'} title="JEE Main + Advanced" onClick={() => setPreparation('JEE_ADVANCED')} />
      <Choice active={preparationMode === 'BOARDS_JEE'} title="Boards + JEE" description="Keep both tracks connected in one study plan." onClick={() => setPreparation('BOARDS_JEE')} />
    </div>,
    <div key="stream" className="grid gap-3 sm:grid-cols-2">
      {([
        ['PCM', 'Science · PCM'],
        ['PCB', 'Science · PCB'],
        ['PCMB', 'Science · PCMB'],
        ['COMMERCE', 'Commerce'],
        ['HUMANITIES', 'Humanities / Arts'],
      ] as const).map(([value, label]) => (
        <Choice
          key={value}
          active={stream === value}
          title={label}
          onClick={() => {
            setStream(value)
            setWeakSubjects([])
            if (value !== 'PCM' && value !== 'PCMB' && targetExams.some((exam) => exam.startsWith('JEE'))) setTargetExams(['BOARDS'])
          }}
        />
      ))}
      {!isPcm && targetExams.some((exam) => exam.startsWith('JEE')) && <p className="text-sm text-amber-600 sm:col-span-2">JEE tools are only shown for PCM/PCMB profiles.</p>}
    </div>,
    <div key="time" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {studyGoals.map((goal) => (
        <Choice key={goal.value} active={dailyStudyGoal === goal.value} title={goal.label} onClick={() => setDailyStudyGoal(goal.value)} />
      ))}
    </div>,
    <div key="weak" className="grid gap-3 sm:grid-cols-2">
      {subjects.map((subject) => (
        <Choice
          key={subject}
          active={weakSubjects.includes(subject)}
          title={subjectNames[subject]}
          description="Tap if this subject needs more attention."
          onClick={() => setWeakSubjects((current) => current.includes(subject) ? current.filter((item) => item !== subject) : [...current, subject])}
        />
      ))}
    </div>,
  ]

  const headings = [
    ['What’s your current class?', `Hey ${firstName}. Let’s shape Lernio around where you are right now.`],
    ['What are you preparing for?', 'Lernio will adapt practice, tests and revision to your goal.'],
    ['Choose your stream', 'You’ll only see subjects and exam tools that are relevant to you.'],
    ['How much do you usually study each day?', 'This keeps your plan ambitious without becoming unrealistic.'],
    ['What feels difficult right now?', 'Optional — Lernio can give these subjects a little more attention.'],
  ]

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold"><Brain className="h-6 w-6 text-primary" /> Lernio AI</div>
          <span className="text-sm text-muted-foreground">Step {step + 1} of {steps.length}</span>
        </header>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        <section className="my-auto py-10">
          <div className="mb-7">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {step === 0 ? <BookOpen className="h-5 w-5" /> : step === 1 ? <Target className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{headings[step][0]}</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">{headings[step][1]}</p>
          </div>
          {steps[step]}
          {step === 2 && <p className="mt-4 text-xs text-muted-foreground">Initial curriculum: CBSE / NCERT. The curriculum layer is designed to support more boards later.</p>}
          {error && <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        </section>

        <footer className="flex items-center justify-between border-t border-border pt-5">
          <button type="button" disabled={step === 0 || saving} onClick={() => setStep((value) => Math.max(0, value - 1))} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-0">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < steps.length - 1 ? (
            <button type="button" onClick={() => setStep((value) => value + 1)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" disabled={saving} onClick={finish} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Build my Lernio
            </button>
          )}
        </footer>
      </div>
    </main>
  )
}
