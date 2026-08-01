'use client'

import { useState } from 'react'
import {
  Bug,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Command,
  Cpu,
  Database,
  GitBranch,
  Network,
  RefreshCcw,
  Route,
  ShieldAlert,
  Sparkles,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Mascot } from '@/components/mascots/mascot'
import { useLocalState } from '@/components/student-os/use-local-state'
import type { MascotKey } from '@/lib/types'
import { cn } from '@/lib/utils'

type DeckKey =
  | 'bug-hunt'
  | 'complexity-clash'
  | 'command-line'
  | 'packet-route'
  | 'register-rush'
  | 'sql-detective'
  | 'logic-gates'
  | 'error-spotter'

interface ChallengeQuestion {
  prompt: string
  code?: string
  options: string[]
  answer: string
  explanation: string
}

interface ChallengeDeck {
  key: DeckKey
  title: string
  subject: string
  description: string
  icon: LucideIcon
  mascot: MascotKey
  questions: ChallengeQuestion[]
}

interface DeckStats {
  correct: number
  attempts: number
}

interface ArcadeProgress {
  decks: Record<DeckKey, DeckStats>
}

const STORAGE_KEY = 'lernio.student-os.challenge-arcade.v1'

const EMPTY_STATS: Record<DeckKey, DeckStats> = {
  'bug-hunt': { correct: 0, attempts: 0 },
  'complexity-clash': { correct: 0, attempts: 0 },
  'command-line': { correct: 0, attempts: 0 },
  'packet-route': { correct: 0, attempts: 0 },
  'register-rush': { correct: 0, attempts: 0 },
  'sql-detective': { correct: 0, attempts: 0 },
  'logic-gates': { correct: 0, attempts: 0 },
  'error-spotter': { correct: 0, attempts: 0 },
}

const DECKS: ChallengeDeck[] = [
  {
    key: 'bug-hunt',
    title: 'Bug Hunt',
    subject: 'Programming',
    description: 'Spot the defect before running the code.',
    icon: Bug,
    mascot: 'coda',
    questions: [
      {
        prompt: 'Why can this loop access memory outside the array?',
        code: 'int a[5];\nfor (int i = 0; i <= 5; i++) cout << a[i];',
        options: ['The array starts at index 1', 'The loop reaches index 5', 'cout changes the array', 'The array needs six semicolons'],
        answer: 'The loop reaches index 5',
        explanation: 'A five-element array has valid indexes 0 through 4. The condition must be i < 5.',
      },
      {
        prompt: 'What is the main problem in this function?',
        code: 'int add(int a, int b) {\n  a + b;\n}',
        options: ['Parameters need pointers', 'The result is not returned', 'The function must be void', 'Addition cannot be used in functions'],
        answer: 'The result is not returned',
        explanation: 'A function declared as int must return an integer value, such as return a + b.',
      },
      {
        prompt: 'Which fix prevents division by zero?',
        code: 'double average = total / count;',
        options: ['Make total a string', 'Check count before dividing', 'Multiply count by zero', 'Remove the semicolon'],
        answer: 'Check count before dividing',
        explanation: 'Validate count != 0 and handle the empty-data case explicitly.',
      },
    ],
  },
  {
    key: 'complexity-clash',
    title: 'Complexity Clash',
    subject: 'Data Structures',
    description: 'Choose the growth rate that matches the algorithm.',
    icon: GitBranch,
    mascot: 'byte',
    questions: [
      {
        prompt: 'A loop visits every element of an n-element array once. What is the time complexity?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
        answer: 'O(n)',
        explanation: 'The amount of work grows directly with the number of array elements.',
      },
      {
        prompt: 'Binary search halves the remaining search range each step. What is its time complexity?',
        options: ['O(log n)', 'O(n)', 'O(n log n)', 'O(2ⁿ)'],
        answer: 'O(log n)',
        explanation: 'Repeated halving produces logarithmic growth.',
      },
      {
        prompt: 'Two nested loops each run n times. What is the usual time complexity?',
        options: ['O(n²)', 'O(n)', 'O(log n)', 'O(n!)'],
        answer: 'O(n²)',
        explanation: 'The inner loop performs n operations for each of n outer iterations.',
      },
    ],
  },
  {
    key: 'command-line',
    title: 'Command Line Quest',
    subject: 'Developer Tools',
    description: 'Select the safest useful terminal command.',
    icon: Command,
    mascot: 'coda',
    questions: [
      {
        prompt: 'Which command shows the current Git working-tree status?',
        options: ['git status', 'git erase', 'git publish-all', 'git format-disk'],
        answer: 'git status',
        explanation: 'git status reports modified, staged and untracked files without changing them.',
      },
      {
        prompt: 'Which command lists files in the current directory on Linux and macOS?',
        options: ['ls', 'pwd-delete', 'mkdir-all', 'cat-dir'],
        answer: 'ls',
        explanation: 'ls lists directory contents. pwd prints the current directory path.',
      },
      {
        prompt: 'Which Git command creates a new branch and switches to it?',
        options: ['git switch -c feature', 'git reset --hard feature', 'git delete feature', 'git force feature'],
        answer: 'git switch -c feature',
        explanation: 'git switch -c creates and checks out a new branch without rewriting existing commits.',
      },
    ],
  },
  {
    key: 'packet-route',
    title: 'Packet Route',
    subject: 'Computer Networks',
    description: 'Trace what moves a packet toward its destination.',
    icon: Route,
    mascot: 'nova',
    questions: [
      {
        prompt: 'Which device forwards packets between different IP networks?',
        options: ['Router', 'Keyboard', 'Repeater only', 'Printer'],
        answer: 'Router',
        explanation: 'Routers inspect network-layer addressing and choose a next hop between networks.',
      },
      {
        prompt: 'Which address identifies a network interface on the local data-link segment?',
        options: ['MAC address', 'File name', 'Port title', 'URL fragment'],
        answer: 'MAC address',
        explanation: 'Ethernet frames use MAC addresses for local-link delivery.',
      },
      {
        prompt: 'Which protocol resolves a domain name such as example.com into an IP address?',
        options: ['DNS', 'FTP', 'SMTP', 'ARP only'],
        answer: 'DNS',
        explanation: 'The Domain Name System maps human-readable names to network addresses.',
      },
    ],
  },
  {
    key: 'register-rush',
    title: 'Register Rush',
    subject: 'Microprocessors',
    description: 'Match processor registers to their role.',
    icon: Cpu,
    mascot: 'pico',
    questions: [
      {
        prompt: 'Which register points to the next instruction to execute?',
        options: ['Instruction pointer', 'Stack data file', 'Printer register', 'Network mask'],
        answer: 'Instruction pointer',
        explanation: 'The instruction pointer/program counter tracks the address of the next instruction.',
      },
      {
        prompt: 'Which register tracks the top of the current stack?',
        options: ['Stack pointer', 'Instruction decoder', 'Display buffer', 'DNS register'],
        answer: 'Stack pointer',
        explanation: 'The stack pointer identifies the current top of the call/data stack.',
      },
      {
        prompt: 'What do processor status flags commonly record?',
        options: ['Arithmetic result conditions', 'File extensions', 'Screen brightness', 'Wi-Fi passwords'],
        answer: 'Arithmetic result conditions',
        explanation: 'Flags record conditions such as zero, carry, sign and overflow.',
      },
    ],
  },
  {
    key: 'sql-detective',
    title: 'SQL Detective',
    subject: 'Databases',
    description: 'Choose the query that retrieves the intended data.',
    icon: Database,
    mascot: 'byte',
    questions: [
      {
        prompt: 'Which clause filters rows before they are returned?',
        options: ['WHERE', 'PRINT', 'FORMAT', 'PACKAGE'],
        answer: 'WHERE',
        explanation: 'WHERE applies a condition to individual rows in a query.',
      },
      {
        prompt: 'Which operation combines related rows from two tables?',
        options: ['JOIN', 'DELETE ALL', 'RENAME DATABASE', 'COMPILE'],
        answer: 'JOIN',
        explanation: 'A JOIN combines rows using a related key or condition.',
      },
      {
        prompt: 'Which aggregate returns the number of matching rows?',
        options: ['COUNT(*)', 'ADDROWS()', 'LENGTH TABLE', 'TOTALFILE'],
        answer: 'COUNT(*)',
        explanation: 'COUNT(*) counts rows in the result group or query.',
      },
    ],
  },
  {
    key: 'logic-gates',
    title: 'Logic Gate Runner',
    subject: 'Digital Electronics',
    description: 'Predict gate output from the inputs.',
    icon: CircleDot,
    mascot: 'pico',
    questions: [
      {
        prompt: 'What is the output of an AND gate for inputs 1 and 0?',
        options: ['0', '1', 'Undefined', '2'],
        answer: '0',
        explanation: 'AND outputs 1 only when every input is 1.',
      },
      {
        prompt: 'What is the output of an OR gate for inputs 0 and 1?',
        options: ['1', '0', '10', 'Undefined'],
        answer: '1',
        explanation: 'OR outputs 1 when at least one input is 1.',
      },
      {
        prompt: 'Which gate reverses a single binary input?',
        options: ['NOT', 'AND', 'OR', 'XOR with no inputs'],
        answer: 'NOT',
        explanation: 'NOT converts 0 to 1 and 1 to 0.',
      },
    ],
  },
  {
    key: 'error-spotter',
    title: 'Error Spotter',
    subject: 'Safe Computing',
    description: 'Recognise unsafe assumptions and weak validation.',
    icon: ShieldAlert,
    mascot: 'leo',
    questions: [
      {
        prompt: 'A form trusts a user-supplied number without checking its range. What is missing?',
        options: ['Input validation', 'A larger font', 'More animations', 'A second logo'],
        answer: 'Input validation',
        explanation: 'Type and range validation prevent invalid data from reaching business logic.',
      },
      {
        prompt: 'A request fails but the interface still displays “Saved successfully.” What is the defect?',
        options: ['False success state', 'Too much caching', 'Correct optimistic update', 'Keyboard mismatch'],
        answer: 'False success state',
        explanation: 'Success must only be shown after the server confirms the operation or a rollback is available.',
      },
      {
        prompt: 'Which approach is safest for a destructive delete action?',
        options: ['Clear confirmation and recoverability', 'Delete on hover', 'Hide the affected item first', 'Use an unlabeled icon only'],
        answer: 'Clear confirmation and recoverability',
        explanation: 'Destructive actions need explicit intent, useful context and ideally an undo or recovery path.',
      },
    ],
  },
]

export function ChallengeArcadeClient() {
  const [activeKey, setActiveKey] = useState<DeckKey>('bug-hunt')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [progress, setProgress] = useLocalState<ArcadeProgress>(STORAGE_KEY, { decks: EMPTY_STATS })

  const deck = DECKS.find((item) => item.key === activeKey) ?? DECKS[0]
  const question = deck.questions[questionIndex]
  const stats = progress.decks[deck.key]
  const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0

  const selectDeck = (key: DeckKey) => {
    setActiveKey(key)
    setQuestionIndex(0)
    setSelected(null)
    setChecked(false)
  }

  const check = () => {
    if (!selected || checked) return
    const correct = selected === question.answer
    setChecked(true)
    setProgress((current) => ({
      decks: {
        ...current.decks,
        [deck.key]: {
          correct: current.decks[deck.key].correct + (correct ? 1 : 0),
          attempts: current.decks[deck.key].attempts + 1,
        },
      },
    }))
    if (correct) toast.success(`Correct. ${question.explanation}`)
    else toast.error(`Review this one. ${question.explanation}`)
  }

  const next = () => {
    setQuestionIndex((current) => (current + 1) % deck.questions.length)
    setSelected(null)
    setChecked(false)
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="grid items-start gap-6 xl:grid-cols-[330px_1fr]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Sparkles className="h-4 w-4" /> Quick Challenge Arcade</div>
          <h2 className="mt-2 text-2xl font-bold">Eight more curriculum arenas</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Short checks for debugging, complexity, terminal work, networking, processors, SQL, logic gates and safe computing.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {DECKS.map((item) => {
              const itemStats = progress.decks[item.key]
              return (
                <button key={item.key} type="button" onClick={() => selectDeck(item.key)} className={cn('rounded-2xl border p-3 text-left', activeKey === item.key ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/30')}>
                  <div className="flex items-start justify-between gap-2"><item.icon className="h-4 w-4 text-primary" />{itemStats.attempts > 0 && <span className="text-[10px] font-semibold text-muted-foreground">{itemStats.correct}/{itemStats.attempts}</span>}</div>
                  <p className="mt-2 text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{item.subject}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-background p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><deck.icon className="h-5 w-5" /></span>
              <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{deck.subject}</p><h3 className="mt-1 text-xl font-bold">{deck.title}</h3><p className="mt-1 text-xs text-muted-foreground">{deck.description}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2"><Mascot mascot={deck.mascot} state={accuracy >= 70 ? 'achievement' : 'greeting'} size={48} /><div><p className="text-xs text-muted-foreground">Deck accuracy</p><p className="font-bold tabular-nums">{accuracy}%</p></div></div>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Question {questionIndex + 1} of {deck.questions.length}</span><span>{stats.attempts} total attempts</span></div>
            <h4 className="mt-4 text-lg font-bold leading-7">{question.prompt}</h4>
            {question.code && <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{question.code}</code></pre>}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {question.options.map((option) => {
                const active = selected === option
                const correctOption = checked && option === question.answer
                const wrongOption = checked && active && option !== question.answer
                return (
                  <button key={option} type="button" onClick={() => { if (!checked) setSelected(option) }} className={cn('rounded-2xl border p-4 text-left text-sm font-semibold transition-colors', active && !checked && 'border-primary bg-primary/10', !active && !checked && 'border-border hover:border-primary/30', correctOption && 'border-emerald-500 bg-emerald-500/10', wrongOption && 'border-rose-500 bg-rose-500/10')}>
                    <span className="flex items-start justify-between gap-3"><span>{option}</span>{correctOption && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}</span>
                  </button>
                )
              })}
            </div>
            {checked && <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6"><strong>Explanation:</strong> {question.explanation}</div>}
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={check} disabled={!selected || checked} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Check answer</button>
              <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent">Next challenge <ChevronRight className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setSelected(null); setChecked(false) }} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent"><RefreshCcw className="h-4 w-4" /> Retry</button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4"><Trophy className="h-5 w-5 text-primary" /><p className="text-sm"><strong>{stats.correct}</strong> correct from <strong>{stats.attempts}</strong> checked attempts in this deck.</p></div>
        </div>
      </div>
    </section>
  )
}
