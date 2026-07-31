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
} from 'lucide-react'
import { toast } from 'sonner'
import { Mascot } from '@/components/mascots/mascot'
import { cn } from '@/lib/utils'
import { STUDENT_OS_STORAGE } from '@/lib/student-os/catalog'
import { useLocalState } from '@/components/student-os/use-local-state'

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

const games: Array<{
  key: GameKey
  title: string
  description: string
  subject: string
  icon: typeof Binary
}> = [
  {
    key: 'binary',
    title: 'Binary Builder',
    description: 'Convert decimal numbers into binary without a calculator.',
    subject: 'Digital fundamentals',
    icon: Binary,
  },
  {
    key: 'osi',
    title: 'OSI Stack',
    description: 'Rebuild the seven network layers in the correct order.',
    subject: 'Data communication',
    icon: Layers3,
  },
  {
    key: 'code-order',
    title: 'Code Order',
    description: 'Arrange program lines so the algorithm works correctly.',
    subject: 'Programming',
    icon: Braces,
  },
  {
    key: 'formula',
    title: 'Formula Forge',
    description: 'Match a computing formula to the situation where it is used.',
    subject: 'Problem solving',
    icon: CircleHelp,
  },
]

function shuffled<T>(items: T[]) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

function resultMessage(correct: boolean, explanation: string) {
  if (correct) toast.success(`Correct. ${explanation}`)
  else toast.error(`Not quite. ${explanation}`)
}

export function GamesClient() {
  const [activeGame, setActiveGame] = useState<GameKey>('binary')
  const [progress, setProgress] = useLocalState<GameProgress>(STUDENT_OS_STORAGE.gameProgress, DEFAULT_PROGRESS)

  const recordAttempt = (game: GameKey, correct: boolean, binaryStreak = 0) => {
    setProgress((current) => ({
      totalCorrect: current.totalCorrect + (correct ? 1 : 0),
      totalAttempts: current.totalAttempts + 1,
      bestBinaryStreak: Math.max(current.bestBinaryStreak, binaryStreak),
      gamesPlayed: {
        ...current.gamesPlayed,
        [game]: current.gamesPlayed[game] + 1,
      },
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
              Every game trains a curriculum skill, gives an immediate explanation and records actual attempts on this device.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/student-os" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2 text-sm font-semibold hover:bg-accent">
                <ArrowLeft className="h-4 w-4" /> Learning Universe
              </Link>
              <Link href="/practice" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Open full practice <ChevronRight className="h-4 w-4" />
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
        <Stat label="Attempts" value={String(progress.totalAttempts)} note="across all games" icon={Zap} />
        <Stat label="Accuracy" value={`${accuracy}%`} note="correct / attempts" icon={Trophy} />
        <Stat label="Binary streak" value={String(progress.bestBinaryStreak)} note="personal best" icon={Binary} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl border border-border bg-card p-3">
          <p className="px-2 pb-3 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose a challenge</p>
          <div className="space-y-2">
            {games.map((game) => {
              const Icon = game.icon
              return (
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
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{game.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{game.subject}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{progress.gamesPlayed[game.key]} rounds</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-h-[520px] rounded-3xl border border-border bg-card p-5 sm:p-7">
          {activeGame === 'binary' && <BinaryBuilder onAttempt={(correct, streak) => recordAttempt('binary', correct, streak)} />}
          {activeGame === 'osi' && <OSIStack onAttempt={(correct) => recordAttempt('osi', correct)} />}
          {activeGame === 'code-order' && <CodeOrder onAttempt={(correct) => recordAttempt('code-order', correct)} />}
          {activeGame === 'formula' && <FormulaForge onAttempt={(correct) => recordAttempt('formula', correct)} />}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Binary }) {
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

  const next = () => {
    setTarget(Math.floor(Math.random() * 31) + 1)
    setAnswer('')
    setFeedback(null)
  }

  const submit = () => {
    const expected = target.toString(2)
    const correct = answer.trim() === expected
    const nextStreak = correct ? streak + 1 : 0
    setStreak(nextStreak)
    setFeedback(correct ? `${target} = ${expected}₂` : `Break ${target} into powers of two: ${expected}₂.`)
    onAttempt(correct, nextStreak)
    resultMessage(correct, correct ? 'You selected the correct powers of two.' : `The correct answer is ${expected}.`)
  }

  return (
    <div>
      <GameHeader
        title="Binary Builder"
        description="Convert the decimal target into binary. Leading zeroes are unnecessary."
        skill="Digital fundamentals"
      />
      <div className="mx-auto max-w-xl rounded-3xl border border-border bg-background p-6 text-center sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Convert this decimal number</p>
        <p className="mt-4 text-7xl font-black tracking-tight">{target}</p>
        <p className="mt-2 text-sm text-muted-foreground">Think in 16, 8, 4, 2 and 1.</p>
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value.replace(/[^01]/g, ''))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && answer) submit()
          }}
          inputMode="numeric"
          placeholder="Example: 1101"
          className="mt-6 w-full rounded-2xl border border-border bg-card px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.3em] outline-none focus:border-primary"
          aria-label="Binary answer"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!answer}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Check answer
          </button>
          <button type="button" onClick={next} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border hover:bg-accent" aria-label="New binary target">
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm">
          <span>Current streak</span>
          <span className="font-bold tabular-nums">{streak}</span>
        </div>
        {feedback && <p className="mt-4 rounded-xl border border-border p-3 text-sm">{feedback}</p>}
      </div>
    </div>
  )
}

const OSI_EXPECTED = ['Application', 'Presentation', 'Session', 'Transport', 'Network', 'Data Link', 'Physical']
const OSI_DESCRIPTIONS: Record<string, string> = {
  Application: 'Services closest to the user and application protocols.',
  Presentation: 'Translation, encryption and compression.',
  Session: 'Starts, maintains and ends communication sessions.',
  Transport: 'End-to-end delivery, reliability and segmentation.',
  Network: 'Logical addressing and routing between networks.',
  'Data Link': 'Frames, MAC addressing and local link delivery.',
  Physical: 'Bits, signals, cables and transmission media.',
}

function OSIStack({ onAttempt }: { onAttempt: (correct: boolean) => void }) {
  const [available, setAvailable] = useState(() => ['Transport', 'Application', 'Physical', 'Session', 'Network', 'Presentation', 'Data Link'])
  const [chosen, setChosen] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  const pick = (layer: string) => {
    if (checked) return
    setChosen((current) => [...current, layer])
    setAvailable((current) => current.filter((item) => item !== layer))
  }

  const undo = () => {
    if (checked || chosen.length === 0) return
    const layer = chosen[chosen.length - 1]
    setChosen((current) => current.slice(0, -1))
    setAvailable((current) => [...current, layer])
  }

  const check = () => {
    const correct = chosen.every((layer, index) => layer === OSI_EXPECTED[index]) && chosen.length === OSI_EXPECTED.length
    setChecked(true)
    onAttempt(correct)
    resultMessage(correct, correct ? 'The stack is ordered from Layer 7 to Layer 1.' : 'Review the correct stack shown beside your answer.')
  }

  const reset = () => {
    setAvailable(shuffled(OSI_EXPECTED))
    setChosen([])
    setChecked(false)
  }

  return (
    <div>
      <GameHeader
        title="OSI Stack"
        description="Select layers from Layer 7 down to Layer 1. Each layer should sit below the previous selection."
        skill="Networks and communication"
      />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-sm font-bold">Available layers</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {available.map((layer) => (
              <button key={layer} type="button" onClick={() => pick(layer)} className="rounded-xl border border-border bg-card px-3 py-3 text-left text-sm font-semibold hover:border-primary hover:bg-primary/5">
                {layer}
              </button>
            ))}
          </div>
          {available.length === 0 && <p className="mt-3 text-sm text-muted-foreground">All layers selected. Check the stack.</p>}
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Your stack</p>
            <button type="button" onClick={undo} className="text-xs font-semibold text-primary disabled:opacity-40" disabled={checked || chosen.length === 0}>Undo</button>
          </div>
          <div className="mt-3 space-y-2">
            {chosen.map((layer, index) => {
              const correctAtPosition = layer === OSI_EXPECTED[index]
              return (
                <div key={layer} className={cn('rounded-xl border p-3', checked ? (correctAtPosition ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5') : 'border-border bg-card')}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">L{7 - index}: {layer}</span>
                    {checked && (correctAtPosition ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{OSI_DESCRIPTIONS[layer]}</p>
                  {checked && !correctAtPosition && <p className="mt-1 text-xs font-semibold text-rose-500">Expected: {OSI_EXPECTED[index]}</p>}
                </div>
              )
            })}
            {chosen.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Your selected layers appear here.</div>}
          </div>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={check} disabled={chosen.length !== 7 || checked} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Check stack</button>
        <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent"><RefreshCcw className="h-4 w-4" /> New round</button>
      </div>
    </div>
  )
}

const CODE_EXPECTED = [
  'int largest = numbers[0];',
  'for (int i = 1; i < n; i++) {',
  'if (numbers[i] > largest) {',
  'largest = numbers[i];',
  '}',
  '}',
  'cout << largest;',
]

function CodeOrder({ onAttempt }: { onAttempt: (correct: boolean) => void }) {
  const initial = ['cout << largest;', 'if (numbers[i] > largest) {', '}', 'int largest = numbers[0];', 'largest = numbers[i];', 'for (int i = 1; i < n; i++) {', '}']
  const [available, setAvailable] = useState(initial)
  const [chosen, setChosen] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  const pick = (line: string, index: number) => {
    if (checked) return
    setChosen((current) => [...current, line])
    setAvailable((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const undo = () => {
    if (checked || chosen.length === 0) return
    const line = chosen[chosen.length - 1]
    setChosen((current) => current.slice(0, -1))
    setAvailable((current) => [...current, line])
  }

  const check = () => {
    const correct = chosen.every((line, index) => line === CODE_EXPECTED[index]) && chosen.length === CODE_EXPECTED.length
    setChecked(true)
    onAttempt(correct)
    resultMessage(correct, correct ? 'The scan initialises, compares, updates and prints in the right order.' : 'Follow variable initialisation before the loop, then comparison and update inside it.')
  }

  const reset = () => {
    setAvailable(shuffled(CODE_EXPECTED))
    setChosen([])
    setChecked(false)
  }

  return (
    <div>
      <GameHeader
        title="Code Order"
        description="Build the body of a program that finds the largest number in an array. Select each line in execution order."
        skill="Programming logic"
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-sm font-bold">Scrambled lines</p>
          <div className="mt-3 space-y-2">
            {available.map((line, index) => (
              <button key={`${line}-${index}`} type="button" onClick={() => pick(line, index)} className="block w-full rounded-xl border border-border bg-slate-950 px-3 py-3 text-left font-mono text-xs text-slate-100 hover:border-primary">
                {line}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Program order</p>
            <button type="button" onClick={undo} disabled={checked || chosen.length === 0} className="text-xs font-semibold text-primary disabled:opacity-40">Undo</button>
          </div>
          <div className="mt-3 min-h-80 rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-100">
            <p className="text-slate-500">// numbers and n are already defined</p>
            {chosen.map((line, index) => {
              const indentation = line === 'largest = numbers[i];' ? '        ' : line.startsWith('if') || line === '}' && index === 4 ? '    ' : ''
              const correctAtPosition = checked ? line === CODE_EXPECTED[index] : null
              return (
                <p key={`${line}-${index}`} className={cn('mt-2 rounded px-2 py-1', correctAtPosition === true && 'bg-emerald-500/15', correctAtPosition === false && 'bg-rose-500/20')}>
                  {indentation}{line}
                </p>
              )
            })}
          </div>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={check} disabled={chosen.length !== CODE_EXPECTED.length || checked} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Run logic check</button>
        <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent"><RefreshCcw className="h-4 w-4" /> New shuffle</button>
      </div>
    </div>
  )
}

const FORMULA_QUESTIONS = [
  {
    prompt: 'An algorithm takes four times longer when the input size doubles. Which growth pattern best fits?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    answer: 'O(n²)',
    explanation: 'For quadratic growth, doubling n multiplies work by 2² = 4.',
  },
  {
    prompt: 'Which expression gives the maximum number of nodes at level k in a binary tree when the root is level 0?',
    options: ['k²', '2ᵏ', '2k', 'k + 1'],
    answer: '2ᵏ',
    explanation: 'Every level can contain twice as many nodes as the previous level.',
  },
  {
    prompt: 'What is the number of possible values represented by n bits?',
    options: ['n²', '2n', '2ⁿ', 'n!'],
    answer: '2ⁿ',
    explanation: 'Each bit has two states, producing 2 × 2 × … × 2 combinations.',
  },
]

function FormulaForge({ onAttempt }: { onAttempt: (correct: boolean) => void }) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const question = FORMULA_QUESTIONS[questionIndex]
  const orderedOptions = useMemo(() => question.options, [question])

  const check = () => {
    if (!selected) return
    const correct = selected === question.answer
    setChecked(true)
    onAttempt(correct)
    resultMessage(correct, question.explanation)
  }

  const next = () => {
    setQuestionIndex((current) => (current + 1) % FORMULA_QUESTIONS.length)
    setSelected(null)
    setChecked(false)
  }

  return (
    <div>
      <GameHeader
        title="Formula Forge"
        description="Choose the expression that matches the situation, then read why it works."
        skill="Computational reasoning"
      />
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-background p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Question {questionIndex + 1} of {FORMULA_QUESTIONS.length}</p>
        <h3 className="mt-3 text-xl font-bold leading-8">{question.prompt}</h3>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {orderedOptions.map((option) => {
            const isSelected = selected === option
            const isCorrect = checked && option === question.answer
            const isWrong = checked && isSelected && option !== question.answer
            return (
              <button
                key={option}
                type="button"
                onClick={() => !checked && setSelected(option)}
                className={cn(
                  'rounded-2xl border p-4 text-left font-mono text-lg font-bold transition-colors',
                  isSelected && !checked && 'border-primary bg-primary/10',
                  !isSelected && !checked && 'border-border hover:border-primary/40',
                  isCorrect && 'border-emerald-500 bg-emerald-500/10',
                  isWrong && 'border-rose-500 bg-rose-500/10',
                )}
              >
                {option}
              </button>
            )
          })}
        </div>
        {checked && <div className="mt-5 rounded-2xl border border-border bg-card p-4 text-sm leading-6"><strong>Why:</strong> {question.explanation}</div>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={check} disabled={!selected || checked} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Check formula</button>
          <button type="button" onClick={next} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-accent">Next question</button>
        </div>
      </div>
    </div>
  )
}
