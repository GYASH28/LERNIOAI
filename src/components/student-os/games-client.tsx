'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Binary,
  Braces,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Gamepad2,
  Layers3,
  RefreshCcw,
  Sparkles,
  Trophy,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Mascot } from '@/components/mascots/mascot'
import { useLocalState } from '@/components/student-os/use-local-state'
import { STUDENT_OS_STORAGE } from '@/lib/student-os/catalog'
import { cn } from '@/lib/utils'

type GameKey = 'binary' | 'osi' | 'code-order' | 'formula'

interface GameProgress {
  totalCorrect: number
  totalAttempts: number
  bestBinaryStreak: number
  gamesPlayed: Record<GameKey, number>
}

const DEFAULT_PROGRESS: GameProgress = {
  totalCorrect: 0,
  totalAttempts: 0,
  bestBinaryStreak: 0,
  gamesPlayed: { binary: 0, osi: 0, 'code-order': 0, formula: 0 },
}

const GAME_CATALOG: Array<{
  key: GameKey
  title: string
  description: string
  subject: string
  icon: LucideIcon
}> = [
  { key: 'binary', title: 'Binary Builder', description: 'Convert decimal values into binary.', subject: 'Digital fundamentals', icon: Binary },
  { key: 'osi', title: 'OSI Stack', description: 'Rebuild the seven network layers.', subject: 'Data communication', icon: Layers3 },
  { key: 'code-order', title: 'Code Order', description: 'Arrange statements into working logic.', subject: 'Programming', icon: Braces },
  { key: 'formula', title: 'Formula Forge', description: 'Match formulas to their use cases.', subject: 'Problem solving', icon: CircleHelp },
]

function shuffled<T>(items: T[]) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function announce(correct: boolean, explanation: string) {
  if (correct) toast.success(`Correct. ${explanation}`)
  else toast.error(`Not quite. ${explanation}`)
}

export function GamesClient() {
  const [activeGame, setActiveGame] = useState<GameKey>('binary')
  const [progress, setProgress] = useLocalState<GameProgress>(STUDENT_OS_STORAGE.gameProgress, DEFAULT_PROGRESS)

  const recordAttempt = (game: GameKey, correct: boolean, streak = 0) => {
    setProgress((current) => ({
      totalCorrect: current.totalCorrect + (correct ? 1 : 0),
      totalAttempts: current.totalAttempts + 1,
      bestBinaryStreak: Math.max(current.bestBinaryStreak, streak),
      gamesPlayed: { ...current.gamesPlayed, [game]: current.gamesPlayed[game] + 1 },
    }))
  }

  const accuracy = progress.totalAttempts > 0
    ? Math.round((progress.totalCorrect / progress.totalAttempts) * 100)
    : 0

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-cyan-500/10 via-primary/10 to-background p-5 sm:p-7">
        <div className="grid items-center gap-5 lg:grid-cols-[1fr_220px]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Gamepad2 className="h-4 w-4" /> Curriculum Game Lab
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Play for mastery, not empty XP.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Each checked round trains a curriculum skill, explains the answer and records a real attempt on this device.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/student-os" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2 text-sm font-semibold hover:bg-accent">
                <ArrowLeft className="h-4 w-4" /> Learning Universe
              </Link>
              <Link href="/practice" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Full practice <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="mx-auto rounded-3xl border border-border bg-background/70 p-4 text-center">
            <Mascot mascot="byte" state={accuracy >= 70 ? 'achievement' : 'greeting'} size={118} />
            <p className="mt-1 text-sm font-bold">BYTE’s training room</p>
            <p className="text-xs text-muted-foreground">Short rounds. Clear feedback.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Correct" value={String(progress.totalCorrect)} note="verified answers" icon={CheckCircle2} />
        <Stat label="Attempts" value={String(progress.totalAttempts)} note="all games" icon={Zap} />
        <Stat label="Accuracy" value={`${accuracy}%`} note="correct / attempts" icon={Trophy} />
        <Stat label="Binary streak" value={String(progress.bestBinaryStreak)} note="personal best" icon={Binary} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl border border-border bg-card p-3">
          <p className="px-2 pb-3 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose a challenge</p>
          <div className="space-y-2">
            {GAME_CATALOG.map((game) => (
              <button
                key={game.key}
                type="button"
                onClick={() => setActiveGame(game.key)}
                className={cn(
                  'w-full rounded-2xl border p-3 text-left transition-colors',
                  activeGame === game.key ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border hover:bg-accent/60',
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
                    <game.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{game.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{game.subject}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">{progress.gamesPlayed[game.key]} rounds</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-h-[520px] rounded-3xl border border-border bg-card p-5 sm:p-7">
          {activeGame === 'binary' && <BinaryBuilder onAttempt={(correct, streak) => recordAttempt('binary', correct, streak)} />}
          {activeGame === 'osi' && <OrderingGame config={OSI_GAME} onAttempt={(correct) => recordAttempt('osi', correct)} />}
          {activeGame === 'code-order' && <OrderingGame config={CODE_GAME} onAttempt={(correct) => recordAttempt('code-order', correct)} monospace />}
          {activeGame === 'formula' && <FormulaForge onAttempt={(correct) => recordAttempt('formula', correct)} />}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  )
}

function GameHeader({ title, description, skill }: { title: string; description: string; skill: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <Sparkles className="h-4 w-4" /> {skill}
      </div>
      <h2 className="mt-2 text-2xl font-bold">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function BinaryBuilder({ onAttempt }: { onAttempt: (correct: boolean, streak: number) => void }) {
  const [target, setTarget] = useState(13)
  const [answer, setAnswer] = useState('')
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)

  const newRound = () => {
    setTarget(Math.floor(Math.random() * 31) + 1)
    setAnswer('')
    setFeedback(null)
  }

  const submit = () => {
    const expected = target.toString(2)
    const correct = answer.trim() === expected
    const nextStreak = correct ? streak + 1 : 0
    setStreak(nextStreak)
    setFeedback(correct ? `${target} = ${expected}₂` : `Use powers of two. The answer is ${expected}₂.`)
    onAttempt(correct, nextStreak)
    announce(correct, correct ? 'You selected the correct powers of two.' : `The correct binary value is ${expected}.`)
  }

  return (
    <div>
      <GameHeader title="Binary Builder" description="Convert the decimal target into binary. Leading zeroes are unnecessary." skill="Digital fundamentals" />
      <div className="mx-auto max-w-xl rounded-3xl border border-border bg-background p-6 text-center sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Convert this decimal number</p>
        <p className="mt-4 text-7xl font-black tracking-tight">{target}</p>
        <p className="mt-2 text-sm text-muted-foreground">Think in 16, 8, 4, 2 and 1.</p>
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value.replace(/[^01]/g, ''))}
          onKeyDown={(event) => { if (event.key === 'Enter' && answer) submit() }}
          inputMode="numeric"
          placeholder="Example: 1101"
          className="mt-6 w-full rounded-2xl border border-border bg-card px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.3em] outline-none focus:border-primary"
          aria-label="Binary answer"
        />
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={submit} disabled={!answer} className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">Check answer</button>
          <button type="button" onClick={newRound} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border hover:bg-accent" aria-label="New binary target"><RefreshCcw className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm"><span>Current streak</span><span className="font-bold tabular-nums">{streak}</span></div>
        {feedback && <p className="mt-4 rounded-xl border border-border p-3 text-sm">{feedback}</p>}
      </div>
    </div>
  )
}

interface OrderingGameConfig {
  title: string
  description: string
  skill: string
  expected: string[]
  initial: string[]
  helper: string
}

const OSI_GAME: OrderingGameConfig = {
  title: 'OSI Stack',
  description: 'Select layers from Layer 7 down to Layer 1.',
  skill: 'Networks and communication',
  expected: ['Application', 'Presentation', 'Session', 'Transport', 'Network', 'Data Link', 'Physical'],
  initial: ['Transport', 'Application', 'Physical', 'Session', 'Network', 'Presentation', 'Data Link'],
  helper: 'Start with user-facing services and finish with bits and signals.',
}

const CODE_GAME: OrderingGameConfig = {
  title: 'Code Order',
  description: 'Build the logic that finds the largest value in an array.',
  skill: 'Programming logic',
  expected: [
    'int largest = numbers[0];',
    'for (int i = 1; i < n; i++) {',
    'if (numbers[i] > largest) {',
    'largest = numbers[i];',
    '}',
    '}',
    'cout << largest;',
  ],
  initial: [
    'cout << largest;',
    'if (numbers[i] > largest) {',
    '}',
    'int largest = numbers[0];',
    'largest = numbers[i];',
    'for (int i = 1; i < n; i++) {',
    '}',
  ],
  helper: 'Initialise first, loop next, compare, update, then print.',
}

function OrderingGame({ config, onAttempt, monospace = false }: { config: OrderingGameConfig; onAttempt: (correct: boolean) => void; monospace?: boolean }) {
  const [available, setAvailable] = useState(config.initial)
  const [chosen, setChosen] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  const pick = (item: string, itemIndex: number) => {
    if (checked) return
    setChosen((current) => [...current, item])
    setAvailable((current) => current.filter((_, index) => index !== itemIndex))
  }

  const undo = () => {
    if (checked || chosen.length === 0) return
    const item = chosen[chosen.length - 1]
    setChosen((current) => current.slice(0, -1))
    setAvailable((current) => [...current, item])
  }

  const submit = () => {
    const correct = chosen.length === config.expected.length && chosen.every((item, index) => item === config.expected[index])
    setChecked(true)
    onAttempt(correct)
    announce(correct, correct ? 'The complete order is correct.' : config.helper)
  }

  const reset = () => {
    setAvailable(shuffled(config.expected))
    setChosen([])
    setChecked(false)
  }

  return (
    <div>
      <GameHeader title={config.title} description={config.description} skill={config.skill} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-sm font-bold">Available items</p>
          <div className="mt-3 space-y-2">
            {available.map((item, index) => (
              <button key={`${item}-${index}`} type="button" onClick={() => pick(item, index)} className={cn('block w-full rounded-xl border border-border bg-card px-3 py-3 text-left text-sm font-semibold hover:border-primary', monospace && 'bg-slate-950 font-mono text-xs text-slate-100')}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between"><p className="text-sm font-bold">Your order</p><button type="button" onClick={undo} disabled={checked || chosen.length === 0} className="text-xs font-semibold text-primary disabled:opacity-40">Undo</button></div>
          <div className={cn('mt-3 min-h-80 space-y-2 rounded-2xl border border-dashed border-border p-3', monospace && 'bg-slate-950 font-mono text-xs text-slate-100')}>
            {chosen.map((item, index) => {
              const correctAtPosition = item === config.expected[index]
              return (
                <div key={`${item}-${index}`} className={cn('flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3', monospace && 'bg-slate-900', checked && correctAtPosition && 'border-emerald-500/40 bg-emerald-500/10', checked && !correctAtPosition && 'border-rose-500/40 bg-rose-500/10')}>
                  <span>{index + 1}. {item}</span>
                  {checked && (correctAtPosition ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="h-4 w-4 shrink-0 text-rose-500" />)}
                </div>
              )
            })}
            {chosen.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Selected items appear here.</p>}
          </div>
        </div>
      </div>
      {checked && !chosen.every((item, index) => item === config.expected[index]) && <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm"><strong>Hint:</strong> {config.helper}</p>}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={submit} disabled={chosen.length !== config.expected.length || checked} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Check order</button>
        <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent"><RefreshCcw className="h-4 w-4" /> New round</button>
      </div>
    </div>
  )
}

const FORMULA_QUESTIONS = [
  { prompt: 'An algorithm takes four times longer when the input doubles. Which growth fits?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 'O(n²)', explanation: 'Doubling n multiplies quadratic work by 2² = 4.' },
  { prompt: 'Maximum nodes at level k in a binary tree, with root at level 0?', options: ['k²', '2ᵏ', '2k', 'k + 1'], answer: '2ᵏ', explanation: 'Each level can contain twice the previous level.' },
  { prompt: 'How many values can n bits represent?', options: ['n²', '2n', '2ⁿ', 'n!'], answer: '2ⁿ', explanation: 'Each independent bit has two states.' },
]

function FormulaForge({ onAttempt }: { onAttempt: (correct: boolean) => void }) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const question = FORMULA_QUESTIONS[questionIndex]
  const options = useMemo(() => question.options, [question])

  const submit = () => {
    if (!selected) return
    const correct = selected === question.answer
    setChecked(true)
    onAttempt(correct)
    announce(correct, question.explanation)
  }

  const next = () => {
    setQuestionIndex((current) => (current + 1) % FORMULA_QUESTIONS.length)
    setSelected(null)
    setChecked(false)
  }

  return (
    <div>
      <GameHeader title="Formula Forge" description="Choose the expression that matches the situation, then inspect why it works." skill="Computational reasoning" />
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-background p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Question {questionIndex + 1} of {FORMULA_QUESTIONS.length}</p>
        <h3 className="mt-3 text-xl font-bold leading-8">{question.prompt}</h3>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {options.map((option) => {
            const selectedOption = selected === option
            const correctOption = checked && option === question.answer
            const wrongOption = checked && selectedOption && option !== question.answer
            return (
              <button key={option} type="button" onClick={() => { if (!checked) setSelected(option) }} className={cn('rounded-2xl border p-4 text-left font-mono text-lg font-bold transition-colors', selectedOption && !checked && 'border-primary bg-primary/10', !selectedOption && !checked && 'border-border hover:border-primary/40', correctOption && 'border-emerald-500 bg-emerald-500/10', wrongOption && 'border-rose-500 bg-rose-500/10')}>
                {option}
              </button>
            )
          })}
        </div>
        {checked && <div className="mt-5 rounded-2xl border border-border bg-card p-4 text-sm leading-6"><strong>Why:</strong> {question.explanation}</div>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={submit} disabled={!selected || checked} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Check formula</button>
          <button type="button" onClick={next} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-accent">Next question</button>
        </div>
      </div>
    </div>
  )
}
