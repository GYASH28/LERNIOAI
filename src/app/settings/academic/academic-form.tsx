'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Save } from 'lucide-react'
import { defaultSubjectsForStream, type ClassLevel, type Stream, type SubjectSlug, type TargetExam } from '@/lib/academics/types'

const labels: Record<SubjectSlug, string> = { physics: 'Physics', chemistry: 'Chemistry', mathematics: 'Mathematics', biology: 'Biology', english: 'English', 'computer-science': 'Computer Science', 'physical-education': 'Physical Education' }

type Props = {
  profile: {
    board: 'CBSE'
    classLevel: ClassLevel
    stream: Stream
    targetExams: TargetExam[]
    targetYear: number
    dailyStudyGoal: number
    weakSubjects: SubjectSlug[]
  }
}

export function AcademicSettingsForm({ profile }: Props) {
  const router = useRouter()
  const [classLevel, setClassLevel] = useState(profile.classLevel)
  const [stream, setStream] = useState(profile.stream)
  const [targetExams, setTargetExams] = useState<TargetExam[]>(profile.targetExams)
  const [targetYear, setTargetYear] = useState(profile.targetYear)
  const [dailyStudyGoal, setDailyStudyGoal] = useState(profile.dailyStudyGoal)
  const [weakSubjects, setWeakSubjects] = useState<SubjectSlug[]>(profile.weakSubjects)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const subjects = useMemo(() => defaultSubjectsForStream(stream), [stream])
  const isPcm = stream === 'PCM' || stream === 'PCMB'

  function toggleExam(exam: TargetExam) {
    if ((exam === 'JEE_MAIN' || exam === 'JEE_ADVANCED') && !isPcm) return
    setTargetExams((current) => {
      if (current.includes(exam)) {
        const next = current.filter((item) => item !== exam)
        if (exam === 'JEE_MAIN') return next.filter((item) => item !== 'JEE_ADVANCED')
        return next.length ? next : ['BOARDS']
      }
      const next = [...current, exam]
      if (exam === 'JEE_ADVANCED' && !next.includes('JEE_MAIN')) next.push('JEE_MAIN')
      return next
    })
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: 'CBSE', classLevel, stream, targetExams, targetYear, dailyStudyGoal, weakSubjects: weakSubjects.filter((subject) => subjects.includes(subject)), preferredLearningStyle: 'balanced' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not update your academic profile.')
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your academic profile.')
    } finally {
      setSaving(false)
    }
  }

  const choice = (active: boolean) => `rounded-xl border px-3 py-2.5 text-sm font-medium transition ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'}`

  return (
    <div className="space-y-6 rounded-3xl border border-border bg-card p-5 sm:p-6">
      <section><label className="text-sm font-semibold">Class</label><div className="mt-2 grid grid-cols-3 gap-2">{(['11','12','DROPPER'] as ClassLevel[]).map((value) => <button key={value} type="button" className={choice(classLevel === value)} onClick={() => setClassLevel(value)}>{value === 'DROPPER' ? 'Dropper' : `Class ${value}`}</button>)}</div></section>
      <section><label className="text-sm font-semibold">Stream</label><div className="mt-2 grid gap-2 sm:grid-cols-3">{(['PCM','PCB','PCMB','COMMERCE','HUMANITIES'] as Stream[]).map((value) => <button key={value} type="button" className={choice(stream === value)} onClick={() => { setStream(value); setWeakSubjects([]); if (value !== 'PCM' && value !== 'PCMB') setTargetExams((current) => current.filter((exam) => exam === 'BOARDS').length ? ['BOARDS'] : ['BOARDS']) }}>{value === 'HUMANITIES' ? 'Humanities' : value === 'COMMERCE' ? 'Commerce' : value}</button>)}</div></section>
      <section><label className="text-sm font-semibold">Preparation goals</label><div className="mt-2 grid gap-2 sm:grid-cols-3">{([['BOARDS','Boards'],['JEE_MAIN','JEE Main'],['JEE_ADVANCED','JEE Advanced']] as [TargetExam,string][]).map(([value,label]) => <button key={value} type="button" disabled={!isPcm && value !== 'BOARDS'} className={`${choice(targetExams.includes(value))} disabled:cursor-not-allowed disabled:opacity-40`} onClick={() => toggleExam(value)}>{label}</button>)}</div>{!isPcm && <p className="mt-2 text-xs text-muted-foreground">JEE tools are intentionally unavailable outside PCM/PCMB profiles.</p>}</section>
      <section className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="target-year" className="text-sm font-semibold">Target year</label><input id="target-year" type="number" min={2026} max={2032} value={targetYear} onChange={(event) => setTargetYear(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" /></div><div><label htmlFor="daily-goal" className="text-sm font-semibold">Daily study goal</label><select id="daily-goal" value={dailyStudyGoal} onChange={(event) => setDailyStudyGoal(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"><option value={30}>30 min</option><option value={60}>1 hour</option><option value={120}>2 hours</option><option value={180}>3 hours</option><option value={240}>4+ hours</option></select></div></section>
      <section><label className="text-sm font-semibold">Subjects that need more attention</label><div className="mt-2 grid gap-2 sm:grid-cols-2">{subjects.map((subject) => { const active = weakSubjects.includes(subject); return <button key={subject} type="button" className={`${choice(active)} flex items-center justify-between text-left`} onClick={() => setWeakSubjects((current) => active ? current.filter((item) => item !== subject) : [...current, subject])}><span>{labels[subject]}</span>{active && <Check className="h-4 w-4" />}</button> })}</div></section>
      {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {saved && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">Academic profile updated. Your account and existing activity were preserved.</p>}
      <button type="button" disabled={saving || targetExams.length === 0} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save academic profile</button>
    </div>
  )
}
