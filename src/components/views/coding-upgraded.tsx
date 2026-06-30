'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  AlignLeft,
  Bot,
  Bug,
  Check,
  Clipboard,
  Code2,
  FileCode,
  Lightbulb,
  ListChecks,
  Loader2,
  Play,
  RefreshCcw,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  WandSparkles,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { consumeTutorStream, type TutorStreamEvent } from '@/lib/ai/stream-protocol'
import { cn } from '@/lib/utils'

type Difficulty = 'easy' | 'medium' | 'hard'
type CodaMode = 'explain_error' | 'hint' | 'explain_code' | 'suggest_test'

type Challenge = {
  id: string
  title: string
  category: string
  difficulty: Difficulty
  description: string
  starterCode: string
  timeLimitMs?: number
  memoryLimitKB?: number
  hint?: string
  example?: { input: string; output: string }
  builtin?: boolean
}

type SyntaxResult = {
  status: 'idle' | 'checking' | 'ok' | 'issues' | 'saved' | 'error' | 'passed' | 'failed' | 'runner_error'
  message: string
  issues: string[]
  xpGain?: number
  testResults?: Array<{
    index: number
    passed: boolean
    actual: string
    stderr: string | null
    durationMs: number | null
    memoryKB: number | null
  }>
}

const FALLBACK_CHALLENGES: Challenge[] = [
  {
    id: 'fallback-hello',
    title: 'Hello, World!',
    category: 'Basic syntax',
    difficulty: 'easy',
    description: 'Print “Hello, World!” using cout, then return successfully from main().',
    starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
    hint: 'Use cout << "Hello, World!" << endl;',
    example: { input: '(none)', output: 'Hello, World!' },
    builtin: true,
  },
  {
    id: 'fallback-class',
    title: 'Classes and Objects',
    category: 'OOP',
    difficulty: 'easy',
    description: 'Create a Student class with private name and roll number fields, setters, and a display method.',
    starterCode: '#include <iostream>\n#include <string>\nusing namespace std;\n\nclass Student {\nprivate:\n    string name;\n    int rollNo;\npublic:\n    // Add setters and display()\n};\n\nint main() {\n    Student student;\n    return 0;\n}\n',
    hint: 'Define public setter methods and remember the semicolon after the class closing brace.',
    example: { input: 'Aarati 5', output: 'Name: Aarati, Roll No: 5' },
    builtin: true,
  },
  {
    id: 'fallback-inheritance',
    title: 'Single Inheritance',
    category: 'Inheritance',
    difficulty: 'medium',
    description: 'Create Vehicle as a base class and Car as a publicly derived class. Call methods from both classes.',
    starterCode: '#include <iostream>\nusing namespace std;\n\nclass Vehicle {\npublic:\n    // Add start()\n};\n\nclass Car : public Vehicle {\npublic:\n    // Add drive()\n};\n\nint main() {\n    Car car;\n    return 0;\n}\n',
    hint: 'Use class Car : public Vehicle and call inherited public methods on the Car object.',
    example: { input: '(none)', output: 'Vehicle started\nCar is driving' },
    builtin: true,
  },
  {
    id: 'fallback-polymorphism',
    title: 'Runtime Polymorphism',
    category: 'Polymorphism',
    difficulty: 'hard',
    description: 'Use a virtual draw() function in Shape and override it in Circle and Square.',
    starterCode: '#include <iostream>\nusing namespace std;\n\nclass Shape {\npublic:\n    virtual void draw() = 0;\n    virtual ~Shape() = default;\n};\n\nclass Circle : public Shape {\npublic:\n    // Override draw()\n};\n\nint main() {\n    return 0;\n}\n',
    hint: 'Use void draw() override in the derived class and call it through a Shape pointer or reference.',
    example: { input: 'circle', output: 'Drawing circle' },
    builtin: true,
  },
]

const MODE_CONFIG: Record<CodaMode, { label: string; icon: typeof Bug; action: string }> = {
  explain_error: { label: 'Explain issues', icon: Bug, action: 'Explain C++ issues' },
  hint: { label: 'Give one hint', icon: Lightbulb, action: 'Give a progressive coding hint' },
  explain_code: { label: 'Explain my code', icon: FileCode, action: 'Explain current C++ code' },
  suggest_test: { label: 'Suggest test cases', icon: ListChecks, action: 'Suggest C++ test cases' },
}

const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  easy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  hard: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

function draftKey(id: string) {
  return `lernio-coding-draft:${id}`
}

function readDraft(id: string) {
  try {
    return window.localStorage.getItem(draftKey(id))
  } catch {
    return null
  }
}

function saveDraftLocally(id: string, code: string) {
  try {
    window.localStorage.setItem(draftKey(id), code)
  } catch {
    // The editor remains usable when storage is unavailable.
  }
}

function removeDraft(id: string) {
  try {
    window.localStorage.removeItem(draftKey(id))
  } catch {
    // Storage is optional.
  }
}

function formatCpp(code: string) {
  const output: string[] = []
  let depth = 0
  for (const raw of code.replace(/\t/g, '    ').split('\n')) {
    const line = raw.trim()
    if (line.startsWith('}')) depth = Math.max(0, depth - 1)
    output.push(line ? `${'    '.repeat(depth)}${line}` : '')
    const opens = (line.match(/{/g) || []).length
    const closes = (line.match(/}/g) || []).length
    depth = Math.max(0, depth + opens - closes)
  }
  return `${output.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

function safeApiMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback
  const error = (payload as { error?: unknown }).error
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return fallback
}

function createCodaPrompt(
  mode: CodaMode,
  challenge: Challenge | null,
  code: string,
  issues: string[],
) {
  const challengeContext = challenge
    ? `Challenge: ${challenge.title}\nDifficulty: ${challenge.difficulty}\nTask: ${challenge.description}`
    : 'No challenge is selected. Review only the code provided.'
  const codeBlock = code.trim().slice(0, 4300) || '// Editor is empty'
  const issueBlock = issues.length ? issues.map((issue, index) => `${index + 1}. ${issue}`).join('\n') : 'No structural preview issues are currently available.'

  const instruction: Record<CodaMode, string> = {
    explain_error:
      'Explain every listed structural issue in simple language, identify the likely location in the code, and show the smallest correction. Clearly distinguish structural preview findings from real compiler errors. Do not claim the code was compiled or executed.',
    hint:
      'Give exactly one progressive hint that moves the student forward without revealing the complete solution. Refer to their current attempt and the challenge requirement.',
    explain_code:
      'Explain the code section by section, then identify likely compile-time, logic, safety, or output-format problems. Do not claim that the code was executed.',
    suggest_test:
      'Suggest useful normal, boundary, and edge test cases with expected behavior. Explain what each test validates. Do not claim the tests were run.',
  }

  return `${instruction[mode]}\n\n${challengeContext}\n\nStructural preview:\n${issueBlock}\n\nCurrent C++ code:\n\`\`\`cpp\n${codeBlock}\n\`\`\``
}

export function CodingView() {
  const [challenges, setChallenges] = useState<Challenge[]>(FALLBACK_CHALLENGES)
  const [source, setSource] = useState<'database' | 'fallback'>('fallback')
  const [loadingChallenges, setLoadingChallenges] = useState(true)
  const [selectedId, setSelectedId] = useState<string>('')
  const [code, setCode] = useState('')
  const [result, setResult] = useState<SyntaxResult>({ status: 'idle', message: '', issues: [] })
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [localSaved, setLocalSaved] = useState(false)
  const [codaMode, setCodaMode] = useState<CodaMode | null>(null)
  const [codaAnswer, setCodaAnswer] = useState('')
  const [codaError, setCodaError] = useState('')
  const [codaFirstTokenMs, setCodaFirstTokenMs] = useState<number | null>(null)
  const [codaTotalMs, setCodaTotalMs] = useState<number | null>(null)
  const codaAbortRef = useRef<AbortController | null>(null)

  const selected = useMemo(
    () => challenges.find((challenge) => challenge.id === selectedId) || null,
    [challenges, selectedId],
  )

  const chooseChallenge = useCallback((challenge: Challenge) => {
    setSelectedId(challenge.id)
    setCode(readDraft(challenge.id) ?? challenge.starterCode)
    setResult({ status: 'idle', message: '', issues: [] })
    setCodaAnswer('')
    setCodaError('')
    setCodaFirstTokenMs(null)
    setCodaTotalMs(null)
  }, [])

  useEffect(() => {
    let active = true
    void fetch('/api/coding', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return
        if (payload?.ok && Array.isArray(payload.data) && payload.data.length > 0) {
          const mapped: Challenge[] = payload.data.map((row: Record<string, unknown>) => ({
            id: String(row.id),
            title: String(row.title || 'Coding challenge'),
            category: String(row.category || 'C++'),
            difficulty: ['easy', 'medium', 'hard'].includes(String(row.difficulty))
              ? (String(row.difficulty) as Difficulty)
              : 'easy',
            description: String(row.description || ''),
            starterCode: String(row.starterCode || ''),
            timeLimitMs: typeof row.timeLimitMs === 'number' ? row.timeLimitMs : undefined,
            memoryLimitKB: typeof row.memoryLimitKB === 'number' ? row.memoryLimitKB : undefined,
          }))
          setChallenges(mapped)
          setSource('database')
          chooseChallenge(mapped[0])
        } else {
          chooseChallenge(FALLBACK_CHALLENGES[0])
        }
      })
      .catch(() => {
        if (active) chooseChallenge(FALLBACK_CHALLENGES[0])
      })
      .finally(() => {
        if (active) setLoadingChallenges(false)
      })
    return () => {
      active = false
      codaAbortRef.current?.abort()
    }
  }, [chooseChallenge])

  useEffect(() => {
    if (!selectedId || !code) return
    const timer = window.setTimeout(() => saveDraftLocally(selectedId, code), 350)
    return () => window.clearTimeout(timer)
  }, [code, selectedId])

  const syntaxPreview = async () => {
    if (!code.trim()) {
      setResult({ status: 'error', message: 'Write some C++ code before previewing its structure.', issues: [] })
      return
    }
    setBusy(true)
    setResult({ status: 'checking', message: 'Checking basic C++ structure…', issues: [] })
    try {
      const response = await fetch('/api/coding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'cpp' }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.ok) throw new Error(safeApiMessage(payload, 'Syntax preview failed.'))
      const issues = Array.isArray(payload.data?.syntax?.issues)
        ? payload.data.syntax.issues.filter((item: unknown): item is string => typeof item === 'string')
        : []
      const ok = payload.data?.syntax?.ok === true
      setResult({
        status: ok ? 'ok' : 'issues',
        message:
          payload.data?.message ||
          (ok
            ? 'No basic structural issues were detected. This does not compile or execute the program.'
            : 'Structural issues were found. Use Coda to understand the corrections.'),
        issues,
      })
    } catch (error) {
      setResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'Could not reach the syntax preview service.',
        issues: [],
      })
    } finally {
      setBusy(false)
    }
  }

  const saveServerDraft = async () => {
    if (!selected || !code.trim()) {
      setResult({ status: 'error', message: 'Select a challenge and write code before saving.', issues: [] })
      return
    }
    setBusy(true)
    setResult({ status: 'checking', message: 'Saving your draft…', issues: [] })
    try {
      const response = await fetch('/api/coding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: selected.id, code, language: 'cpp' }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.ok) throw new Error(safeApiMessage(payload, 'Could not save draft.'))

      const data = payload.data
      const resultStatus: SyntaxResult['status'] = data.status === 'executed'
        ? data.passed
          ? 'passed'
          : data.runnerStatus === 'failed'
            ? 'failed'
            : 'runner_error'
        : 'saved'

      setResult({
        status: resultStatus,
        message: data.message || 'Draft saved. It was not compiled, executed, or scored.',
        issues: [],
        xpGain: data.xpGain,
        testResults: data.testResults,
      })
    } catch (error) {
      setResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'Could not save draft.',
        issues: [],
      })
    } finally {
      setBusy(false)
    }
  }

  const stopCoda = () => {
    codaAbortRef.current?.abort()
    codaAbortRef.current = null
    setCodaMode(null)
  }

  const askCoda = async (mode: CodaMode) => {
    if (codaMode) return
    setCodaMode(mode)
    setCodaAnswer('')
    setCodaError('')
    setCodaFirstTokenMs(null)
    setCodaTotalMs(null)

    const controller = new AbortController()
    codaAbortRef.current = controller

    try {
      const response = await fetch('/api/ai/action/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          view: 'coding',
          action: MODE_CONFIG[mode].action,
          prompt: createCodaPrompt(mode, selected, code, result.issues),
          context: {
            subjectName: 'Object Oriented Programming with C++',
            topicTitle: selected?.title,
          },
        }),
      })

      await consumeTutorStream(response, (event: TutorStreamEvent) => {
        if (event.type === 'delta') {
          setCodaAnswer((current) => current + event.text)
        } else if (event.type === 'done') {
          setCodaAnswer(event.message.content)
          setCodaFirstTokenMs(event.firstTokenMs ?? null)
          setCodaTotalMs(event.totalMs)
        } else if (event.type === 'error') {
          setCodaError(event.message)
        }
      })
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setCodaError(error instanceof Error ? error.message : 'Coda could not complete this request.')
      }
    } finally {
      codaAbortRef.current = null
      setCodaMode(null)
    }
  }

  const copyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const resetCode = () => {
    if (!selected) return
    removeDraft(selected.id)
    setCode(selected.starterCode)
    setResult({ status: 'idle', message: '', issues: [] })
  }

  const saveLocal = () => {
    if (!selected) return
    saveDraftLocally(selected.id, code)
    setLocalSaved(true)
    window.setTimeout(() => setLocalSaved(false), 1500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3" role="note">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-xs leading-5 text-amber-900 dark:text-amber-100">
          <strong>Syntax-learning playground.</strong> Preview checks basic structure only. It does not compile, execute, grade, or award XP. Coda can review your code, but it also does not run it.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-background to-primary/5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
            <Code2 className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold">C++ Coding Lab</h1>
              <Badge variant="outline">{source === 'database' ? 'Course challenges' : 'Built-in practice'}</Badge>
              <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                <Zap className="h-3 w-3" /> Live Coda AI
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Draft, inspect, and understand C++ with real streamed coding guidance.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              Challenges
              <Badge variant="secondary">{challenges.length}</Badge>
            </CardTitle>
            <CardDescription>
              Choose a task to load its starter code. Drafts are restored from this browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingChallenges ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-muted" />)}
              </div>
            ) : (
              <ScrollArea className="h-[620px] pr-3">
                <div className="space-y-2">
                  {challenges.map((challenge) => (
                    <button
                      key={challenge.id}
                      type="button"
                      onClick={() => chooseChallenge(challenge)}
                      className={cn(
                        'w-full rounded-xl border p-3 text-left transition hover:border-amber-500/40 hover:bg-amber-500/5',
                        selectedId === challenge.id && 'border-amber-500/50 bg-amber-500/8 shadow-sm',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold leading-snug">{challenge.title}</p>
                        <Badge variant="outline" className={cn('capitalize', DIFFICULTY_CLASS[challenge.difficulty])}>
                          {challenge.difficulty}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{challenge.category}</p>
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{challenge.description}</p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          {selected ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{selected.title}</CardTitle>
                <CardDescription>{selected.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/25 p-3 text-xs">
                  <p className="font-semibold">Category</p>
                  <p className="mt-1 text-muted-foreground">{selected.category}</p>
                </div>
                <div className="rounded-lg border bg-muted/25 p-3 text-xs">
                  <p className="font-semibold">Time limit target</p>
                  <p className="mt-1 text-muted-foreground">{selected.timeLimitMs ?? 5000} ms</p>
                </div>
                <div className="rounded-lg border bg-muted/25 p-3 text-xs">
                  <p className="font-semibold">Memory target</p>
                  <p className="mt-1 text-muted-foreground">{Math.round((selected.memoryLimitKB ?? 256000) / 1000)} MB</p>
                </div>
                {selected.example ? (
                  <div className="sm:col-span-3 rounded-lg border bg-muted/25 p-3 text-xs">
                    <p className="font-semibold">Example</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <pre className="overflow-auto rounded bg-background p-2">Input: {selected.example.input}</pre>
                      <pre className="overflow-auto rounded bg-background p-2">Output: {selected.example.output}</pre>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-zinc-900 font-mono text-zinc-100 hover:bg-zinc-900">main.cpp</Badge>
                <span className="text-xs text-muted-foreground">{code.split('\n').length} lines · {code.length} chars</span>
                {localSaved ? <span className="text-xs font-semibold text-emerald-600">Saved</span> : null}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => void copyCode()}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                  Copy
                </Button>
                <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => setCode(formatCpp(code))}>
                  <AlignLeft className="h-3.5 w-3.5" /> Format
                </Button>
                <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={resetCode} disabled={!selected}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
                <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={saveLocal} disabled={!selected}>
                  <Save className="h-3.5 w-3.5" /> Save local
                </Button>
              </div>
            </div>
            <Textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              spellCheck={false}
              className="min-h-[430px] resize-y rounded-none border-0 bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-100 focus-visible:ring-0"
              placeholder="// Write C++ here"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-zinc-900 px-3 py-2">
              <span className="text-xs text-zinc-400">
                {result.status === 'checking' ? 'Working…' : result.status === 'issues' ? `${result.issues.length} structural issue(s)` : result.status === 'ok' ? 'Structure looks consistent' : result.status === 'saved' ? 'Draft saved' : 'Ready'}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 border-amber-500/40 text-amber-500" onClick={() => void syntaxPreview()} disabled={busy}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Syntax preview
                </Button>
                <Button size="sm" className="gap-1.5 bg-amber-500 text-white hover:bg-amber-600" onClick={() => void saveServerDraft()} disabled={busy || !selected}>
                  <Send className="h-3.5 w-3.5" /> Submit code
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Terminal className="h-4 w-4" /> Run & Submission Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-h-28 rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-200">
                {result.message || 'Run Syntax preview or Submit code to see execution results.'}
                {result.issues.length ? (
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-amber-300">
                    {result.issues.map((issue) => <li key={issue}>{issue}</li>)}
                  </ol>
                ) : null}

                {result.testResults && result.testResults.length > 0 ? (
                  <div className="space-y-2 border-t border-zinc-800 pt-3 mt-3">
                    <p className="font-semibold text-zinc-300 font-sans text-xs">Test Case Execution Results:</p>
                    <div className="grid gap-2">
                      {result.testResults.map((tr) => (
                        <div key={tr.index} className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-1.5 text-xs font-sans">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-400">Test Case #{tr.index + 1}</span>
                            <Badge className={tr.passed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}>
                              {tr.passed ? 'Passed' : 'Failed'}
                            </Badge>
                          </div>
                          {tr.stderr && (
                            <div className="text-rose-400 bg-rose-950/20 p-1.5 rounded font-mono text-[10px] whitespace-pre-wrap">{tr.stderr}</div>
                          )}
                          <div className="grid grid-cols-1 gap-1 text-[10px] text-zinc-500">
                            <div className="truncate">Actual Output: <span className="font-mono text-zinc-300 bg-black/35 px-1 py-0.5 rounded">{tr.actual || '(no output)'}</span></div>
                            <div className="flex justify-between text-zinc-600 mt-1">
                              <span>Time: {tr.durationMs ?? 'N/A'} ms</span>
                              <span>Memory: {tr.memoryKB ?? 'N/A'} KB</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <WandSparkles className="h-4 w-4" />
                    </span>
                    Coda AI Coding Coach
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Real streamed analysis of the selected challenge and your current code.
                  </CardDescription>
                </div>
                {codaMode ? (
                  <Button size="sm" variant="destructive" className="gap-1.5" onClick={stopCoda}>
                    <Square className="h-3.5 w-3.5" /> Stop
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(MODE_CONFIG) as CodaMode[]).map((mode) => {
                  const config = MODE_CONFIG[mode]
                  const Icon = config.icon
                  return (
                    <Button
                      key={mode}
                      variant="outline"
                      className="h-auto justify-start gap-2 py-2.5"
                      onClick={() => void askCoda(mode)}
                      disabled={Boolean(codaMode)}
                    >
                      {codaMode === mode ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Icon className="h-4 w-4 text-primary" />}
                      {config.label}
                    </Button>
                  )
                })}
              </div>

              <div className="mt-4 min-h-44 rounded-2xl border bg-muted/20 p-4">
                {codaMode && !codaAnswer ? (
                  <div className="flex min-h-36 flex-col items-center justify-center text-center">
                    <span className="relative grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-6 w-6" />
                      <span className="absolute inset-0 animate-ping rounded-full border border-primary/30" />
                    </span>
                    <p className="mt-3 text-sm font-semibold">Coda is reviewing your current code</p>
                    <p className="mt-1 text-xs text-muted-foreground">The response will appear token by token.</p>
                  </div>
                ) : codaAnswer ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{codaAnswer}</ReactMarkdown>
                    {codaMode ? <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded bg-primary align-middle" /> : null}
                  </div>
                ) : codaError ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <p className="font-semibold">Coda could not complete the review</p>
                    <p className="mt-1">{codaError}</p>
                  </div>
                ) : (
                  <div className="flex min-h-36 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                    <Sparkles className="mb-3 h-7 w-7 text-primary/60" />
                    Choose an action to get provider-backed C++ guidance. No scripted answer or artificial delay is used.
                  </div>
                )}
              </div>

              {(codaFirstTokenMs !== null || codaTotalMs !== null) && !codaMode ? (
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold text-muted-foreground">
                  {codaFirstTokenMs !== null ? <span>First words {(codaFirstTokenMs / 1000).toFixed(1)}s</span> : null}
                  {codaTotalMs !== null ? <span>Total {(codaTotalMs / 1000).toFixed(1)}s</span> : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 gap-1 text-xs"
                    onClick={() => codaAnswer && navigator.clipboard.writeText(codaAnswer)}
                    disabled={!codaAnswer}
                  >
                    <Clipboard className="h-3.5 w-3.5" /> Copy answer
                  </Button>
                </div>
              ) : null}

              {codaError && !codaMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={() => void askCoda('explain_code')}
                >
                  <RefreshCcw className="h-3.5 w-3.5" /> Retry code review
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
