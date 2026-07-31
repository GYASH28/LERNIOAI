'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowLeft,
  Check,
  Clock3,
  Gauge,
  Languages,
  Save,
  Sparkles,
  Target,
  Volume2,
  WifiOff,
  WandSparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Mascot } from '@/components/mascots/mascot'
import { cn } from '@/lib/utils'
import {
  ADAPTIVE_PATHS,
  DEFAULT_STUDENT_PROFILE,
  MASCOT_CATALOG,
  STUDENT_OS_STORAGE,
  type StudentLanguage,
  type StudentLearningProfile,
  type StudentLearningStyle,
} from '@/lib/student-os/catalog'
import { useLocalState } from '@/components/student-os/use-local-state'

interface LearningProfileClientProps {
  programme: 'DCOMP' | 'DCIOT'
  semester: number
  dailyMinutes: number
  preferredLanguage: string
}

const languageOptions: Array<{ value: StudentLanguage; label: string; description: string }> = [
  { value: 'english', label: 'English', description: 'Clear technical English.' },
  { value: 'hinglish', label: 'Hinglish', description: 'English concepts with natural Hindi support.' },
  { value: 'marathi', label: 'Marathi', description: 'Marathi explanations where supported.' },
]

const styleOptions: Array<{ value: StudentLearningStyle; label: string; description: string }> = [
  { value: 'balanced', label: 'Balanced', description: 'Mix notes, video, examples and practice.' },
  { value: 'visual', label: 'Visual', description: 'Prefer diagrams, flows and simulations.' },
  { value: 'practice-first', label: 'Practice first', description: 'Start with a question and learn from gaps.' },
  { value: 'video-first', label: 'Video first', description: 'Begin with the mapped explanation.' },
  { value: 'reading-first', label: 'Reading first', description: 'Start from complete structured notes.' },
]

function languageFromDatabase(value: string): StudentLanguage {
  if (value === 'mr') return 'marathi'
  if (value === 'hi') return 'hinglish'
  return 'english'
}

export function LearningProfileClient({
  programme,
  semester,
  dailyMinutes,
  preferredLanguage,
}: LearningProfileClientProps) {
  const fallback: StudentLearningProfile = {
    ...DEFAULT_STUDENT_PROFILE,
    programme,
    semester,
    dailyMinutes,
    weeklyGoalMinutes: dailyMinutes * 5,
    language: languageFromDatabase(preferredLanguage),
  }
  const [savedProfile, setSavedProfile, hydrated] = useLocalState(STUDENT_OS_STORAGE.profile, fallback)
  const [draft, setDraft] = useState<StudentLearningProfile>(fallback)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  if (hydrated && !draftLoaded) {
    setDraft(savedProfile)
    setDraftLoaded(true)
  }

  const update = <K extends keyof StudentLearningProfile>(key: K, value: StudentLearningProfile[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/student-os/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyMinutes: draft.dailyMinutes, language: draft.language }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message || 'Could not sync profile preferences.')
      setSavedProfile(draft)
      toast.success('Learning profile saved and study-time preferences synced.')
    } catch (error) {
      setSavedProfile(draft)
      toast.warning(error instanceof Error ? `${error.message} Saved on this device instead.` : 'Saved on this device.')
    } finally {
      setSaving(false)
    }
  }

  if (!hydrated || !draftLoaded) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-center">
        <div>
          <Mascot mascot="leo" state="thinking" size={96} />
          <p className="mt-3 text-sm text-muted-foreground">Loading your learning preferences…</p>
        </div>
      </div>
    )
  }

  const selectedMascot = MASCOT_CATALOG.find((item) => item.key === draft.mascot) ?? MASCOT_CATALOG[0]

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-cyan-500/5 to-background p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <WandSparkles className="h-4 w-4" /> Personal learning profile
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Teach me the way I actually study.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              These choices control recommendations, mission size, mascot guidance and media preferences. They do not unlock fake content or change official curriculum records.
            </p>
            <Link href="/student-os" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2.5 text-sm font-semibold hover:bg-accent">
              <ArrowLeft className="h-4 w-4" /> Back to Learning Universe
            </Link>
          </div>
          <div className="rounded-3xl border border-border bg-background/70 p-4 text-center">
            <Mascot mascot={draft.mascot} state="greeting" size={116} animated={!draft.reducedMotion} />
            <p className="mt-1 font-bold">{selectedMascot.name}</p>
            <p className="text-xs text-muted-foreground">{selectedMascot.specialty}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ProfileCard icon={Target} eyebrow="Academic context" title="My programme">
          <div className="grid grid-cols-2 gap-3">
            {(['DCOMP', 'DCIOT'] as const).map((value) => (
              <ChoiceButton
                key={value}
                selected={draft.programme === value}
                title={value === 'DCOMP' ? 'Computer Engineering' : 'Computer & IoT'}
                description={value}
                onClick={() => update('programme', value)}
              />
            ))}
          </div>
          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Semester</span>
            <select value={draft.semester} onChange={(event) => update('semester', Number(event.target.value))} className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary">
              {[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>Semester {value}</option>)}
            </select>
          </label>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">Official department and semester changes should still be made from your main profile when required.</p>
        </ProfileCard>

        <ProfileCard icon={Clock3} eyebrow="Available time" title="Study load">
          <label className="block">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Daily target</span>
              <span className="font-bold text-primary">{draft.dailyMinutes} minutes</span>
            </div>
            <input
              type="range"
              min={15}
              max={240}
              step={15}
              value={draft.dailyMinutes}
              onChange={(event) => update('dailyMinutes', Number(event.target.value))}
              className="mt-3 w-full accent-primary"
            />
          </label>
          <label className="mt-6 block">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Weekly focused goal</span>
              <span className="font-bold text-primary">{draft.weeklyGoalMinutes} minutes</span>
            </div>
            <input
              type="range"
              min={60}
              max={1200}
              step={30}
              value={draft.weeklyGoalMinutes}
              onChange={(event) => update('weeklyGoalMinutes', Number(event.target.value))}
              className="mt-3 w-full accent-primary"
            />
          </label>
          <div className="mt-5 rounded-2xl bg-muted/50 p-4 text-sm leading-6">
            Lernio will keep daily missions near <strong>{draft.dailyMinutes} minutes</strong> and avoid filling every minute with work.
          </div>
        </ProfileCard>

        <ProfileCard icon={Languages} eyebrow="Explanation style" title="Language">
          <div className="space-y-3">
            {languageOptions.map((option) => (
              <ChoiceButton
                key={option.value}
                selected={draft.language === option.value}
                title={option.label}
                description={option.description}
                onClick={() => update('language', option.value)}
              />
            ))}
          </div>
        </ProfileCard>

        <ProfileCard icon={Gauge} eyebrow="Learning behaviour" title="Preferred starting point">
          <div className="grid gap-3 sm:grid-cols-2">
            {styleOptions.map((option) => (
              <ChoiceButton
                key={option.value}
                selected={draft.learningStyle === option.value}
                title={option.label}
                description={option.description}
                onClick={() => update('learningStyle', option.value)}
              />
            ))}
          </div>
        </ProfileCard>
      </section>

      <ProfileCard icon={Sparkles} eyebrow="Adaptive learning" title="Default learning path">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ADAPTIVE_PATHS.map((path) => (
            <ChoiceButton
              key={path.id}
              selected={draft.learningMode === path.id}
              title={path.title}
              description={`${path.description} Best for: ${path.bestFor}.`}
              onClick={() => update('learningMode', path.id)}
            />
          ))}
        </div>
      </ProfileCard>

      <ProfileCard icon={Sparkles} eyebrow="Learning companions" title="Choose your guide">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {MASCOT_CATALOG.map((mascot) => (
            <button
              key={mascot.key}
              type="button"
              onClick={() => update('mascot', mascot.key)}
              className={cn(
                'rounded-2xl border p-4 text-center transition-transform hover:-translate-y-0.5',
                draft.mascot === mascot.key ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-background',
              )}
            >
              <Mascot mascot={mascot.key} state={draft.mascot === mascot.key ? 'greeting' : 'idle'} size={82} animated={!draft.reducedMotion} />
              <p className="mt-2 font-bold">{mascot.name}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{mascot.specialty}</p>
            </button>
          ))}
        </div>
      </ProfileCard>

      <section className="grid gap-5 md:grid-cols-3">
        <ToggleCard
          icon={WifiOff}
          title="Low-data mode"
          description="Prefer text and shorter media where available."
          enabled={draft.lowBandwidth}
          onChange={(value) => update('lowBandwidth', value)}
        />
        <ToggleCard
          icon={Volume2}
          title="Mascot sounds"
          description="Allow subtle success and reminder sounds."
          enabled={draft.soundEnabled}
          onChange={(value) => update('soundEnabled', value)}
        />
        <ToggleCard
          icon={Sparkles}
          title="Reduced motion"
          description="Reduce mascot and decorative animation."
          enabled={draft.reducedMotion}
          onChange={(value) => update('reducedMotion', value)}
        />
      </section>

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-border bg-background/90 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="px-2">
          <p className="text-sm font-semibold">Your plan is transparent and editable.</p>
          <p className="text-xs text-muted-foreground">Daily time and language sync to your account; additional experience preferences are stored on this device.</p>
        </div>
        <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save learning profile'}
        </button>
      </div>
    </div>
  )
}

function ProfileCard({ icon: Icon, eyebrow, title, children }: { icon: typeof Target; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
          <h2 className="mt-0.5 text-xl font-bold">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  )
}

function ChoiceButton({ selected, title, description, onClick }: { selected: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-full rounded-2xl border p-4 text-left transition-colors',
        selected ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">{title}</p>
        {selected && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>}
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </button>
  )
}

function ToggleCard({ icon: Icon, title, description, enabled, onChange }: { icon: typeof Target; title: string; description: string; enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!enabled)} className={cn('rounded-2xl border p-5 text-left transition-colors', enabled ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/30')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-primary"><Icon className="h-5 w-5" /></div>
        <span className={cn('relative h-6 w-11 rounded-full transition-colors', enabled ? 'bg-primary' : 'bg-muted')}>
          <span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform', enabled ? 'translate-x-6' : 'translate-x-1')} />
        </span>
      </div>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </button>
  )
}
