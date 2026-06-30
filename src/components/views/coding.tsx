'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Mascot } from '@/components/mascots/mascot'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  Code2, Play, Save, RotateCcw, Copy, Check, AlignLeft,
  Bug, Lightbulb, FileCode, ListChecks, ChevronRight, ChevronDown,
  CheckCircle2, XCircle, Loader2, Sparkles, Terminal, Info,
  Cpu, ShieldAlert
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MascotState } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestCase { input: string; expected: string }

interface ChallengeCurriculum {
  subjectId: string | null
  unitId: string | null
  topicId: string | null
  lessonId: string | null
  subjectCode: string | null
  subjectName: string | null
  unitNumber: number | null
  unitTitle: string | null
  topicSlug: string | null
  topicTitle: string | null
  lessonTitle: string | null
}

interface Challenge {
  id: string
  title: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  description: string
  starterCode: string
  timeLimitMs?: number
  memoryLimitKB?: number
  /** Only present on built-in demo fallbacks (DB rows strip these). */
  testCases?: TestCase[]
  hint?: string
  ioExample?: { input: string; output: string }
  status?: string
  sourceEvidence?: string | null
  curriculum?: ChallengeCurriculum
  /** True for the client-side demo fallback set (when the API is empty). */
  isBuiltin?: boolean
}

/**
 * Result of a "Syntax Preview" run or a challenge submission.
 *
 * HONESTY CONTRACT — this view only claims a program passed after a trusted
 * runner result is validated by the server.
 * `status` can only be one of:
 *   - idle          : nothing run yet
 *   - running       : a request is in flight
 *   - preview_ok    : local syntax preview found no structural issues
 *   - preview_issues: local syntax preview found structural issues
 *   - draft_saved   : code was saved as a draft submission (not executed)
 *   - error         : the request itself failed (network / server)
 *
 * There is no "passed" status. Wrong programs can never appear to pass.
 */
interface SyntaxCheck {
  ok: boolean
  issues: string[]
}

interface RunResult {
  status: 'idle' | 'running' | 'preview_ok' | 'preview_issues' | 'draft_saved' | 'passed' | 'failed' | 'runner_error' | 'error'
  message: string
  syntax: SyntaxCheck | null
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

// ---------------------------------------------------------------------------
// Built-in fallback challenges (used ONLY when /api/coding returns empty).
// These are clearly labelled "demo" in the UI so the learner knows they are
// not the curated DB set.
// ---------------------------------------------------------------------------

const BUILTIN_CHALLENGES: Challenge[] = [
  {
    id: 'builtin-1',
    title: 'Hello, World!',
    category: 'basic_syntax',
    difficulty: 'easy',
    isBuiltin: true,
    description:
      'Write a C++ program that prints "Hello, World!" to the console. This is the classic first program — it introduces the #include directive, the iostream library, the std namespace, and the main function.',
    starterCode:
      '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}',
    testCases: [{ input: '', expected: 'Hello, World!' }],
    hint: 'Use cout to print output, and endl or "\\n" for a newline.',
    ioExample: { input: '(none)', output: 'Hello, World!' },
  },
  {
    id: 'builtin-2',
    title: 'Classes and Objects',
    category: 'classes',
    difficulty: 'easy',
    isBuiltin: true,
    description:
      'Create a Student class with private data members: name (string) and rollNo (int). Add public methods setName(), setRollNo(), and display(). In main(), create a Student object, set its values, and call display().',
    starterCode:
      '#include <iostream>\n#include <string>\nusing namespace std;\n\nclass Student {\nprivate:\n    string name;\n    int rollNo;\npublic:\n    // Define setters and display() here\n};\n\nint main() {\n    Student s;\n    // Set values and display\n    return 0;\n}',
    testCases: [
      { input: 'Aarati 5', expected: 'Name: Aarati, Roll No: 5' },
      { input: 'Ravi 12', expected: 'Name: Ravi, Roll No: 12' },
    ],
    hint: 'Use void setName(string n) { name = n; } pattern for each setter.',
    ioExample: { input: 'Aarati 5', output: 'Name: Aarati, Roll No: 5' },
  },
  {
    id: 'builtin-3',
    title: 'Constructor Overloading',
    category: 'constructors',
    difficulty: 'medium',
    isBuiltin: true,
    description:
      'Create a Rectangle class with two constructors: a default constructor that sets length=1, breadth=1, and a parameterised constructor Rectangle(int l, int b). Add an area() method that returns length*breadth.',
    starterCode:
      '#include <iostream>\nusing namespace std;\n\nclass Rectangle {\n    int length, breadth;\npublic:\n    // Default constructor\n    // Parameterised constructor\n    // int area() method\n};\n\nint main() {\n    Rectangle r1;\n    Rectangle r2(5, 4);\n    // Print areas\n    return 0;\n}',
    testCases: [
      { input: 'default', expected: 'Area: 1' },
      { input: '5 4', expected: 'Area: 20' },
    ],
    hint: 'Two constructors share the class name but differ in parameter count/type.',
    ioExample: { input: '5 4', output: 'Area: 20' },
  },
  {
    id: 'builtin-4',
    title: 'Single Inheritance',
    category: 'inheritance',
    difficulty: 'medium',
    isBuiltin: true,
    description:
      'Create a base class Vehicle with a start() method that prints "Vehicle started". Create a derived class Car (public Vehicle) that adds a drive() method printing "Car is driving". In main(), create a Car object and call both methods.',
    starterCode:
      '#include <iostream>\nusing namespace std;\n\nclass Vehicle {\npublic:\n    // void start()\n};\n\nclass Car : public Vehicle {\npublic:\n    // void drive()\n};\n\nint main() {\n    Car c;\n    // Call start() and drive()\n    return 0;\n}',
    testCases: [
      { input: '', expected: 'Vehicle started\nCar is driving' },
    ],
    hint: 'Use `class Derived : public Base` syntax for public inheritance.',
    ioExample: { input: '(none)', output: 'Vehicle started\nCar is driving' },
  },
  {
    id: 'builtin-5',
    title: 'Template Function — Max',
    category: 'templates',
    difficulty: 'medium',
    isBuiltin: true,
    description:
      'Write a template function myMax() that takes two arguments of the same type and returns the larger one. In main(), call myMax() with two ints, two doubles, and two chars.',
    starterCode:
      '#include <iostream>\nusing namespace std;\n\n// template <typename T>\n// T myMax(T a, T b)\n\nint main() {\n    // Call myMax with int, double, char\n    return 0;\n}',
    testCases: [
      { input: 'ints 5 9', expected: '9' },
      { input: 'doubles 3.14 2.71', expected: '3.14' },
      { input: 'chars a z', expected: 'z' },
    ],
    hint: 'Use `template <typename T>` before the function definition.',
    ioExample: { input: 'ints 5 9', output: '9' },
  },
  {
    id: 'builtin-6',
    title: 'Pointer Basics — Swap',
    category: 'pointers',
    difficulty: 'easy',
    isBuiltin: true,
    description:
      'Read two integers, swap them using pointers (dereference to exchange values), and print the result. Demonstrates the & address-of and * dereference operators.',
    starterCode:
      '#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    // Read a, b; swap using pointers; print a b\n    return 0;\n}',
    testCases: [
      { input: '3 5', expected: '5 3' },
      { input: '10 20', expected: '20 10' },
    ],
    hint: 'Declare int* pa = &a; then use *pa to read/write the value.',
    ioExample: { input: '3 5', output: '5 3' },
  },
  {
    id: 'builtin-7',
    title: 'Function Overloading — Area',
    category: 'function_overloading',
    difficulty: 'easy',
    isBuiltin: true,
    description:
      'Write overloaded functions named area(): one taking one int (square side), one taking two ints (rectangle l,b), and one taking a double (circle radius).',
    starterCode:
      '#include <iostream>\nusing namespace std;\n\n// int area(int side)\n// int area(int l, int b)\n// double area(double r)\n\nint main() {\n    // Call each and print\n    return 0;\n}',
    testCases: [
      { input: 'square 5', expected: '25' },
      { input: 'rectangle 5 4', expected: '20' },
      { input: 'circle 7', expected: '153.86' },
    ],
    hint: 'Same function name, different parameter lists — the compiler picks the right one.',
    ioExample: { input: 'rectangle 5 4', output: '20' },
  },
  {
    id: 'builtin-8',
    title: 'Polymorphism — Virtual Function',
    category: 'polymorphism',
    difficulty: 'hard',
    isBuiltin: true,
    description:
      'Create a base class Shape with a virtual function draw(). Derive Circle and Square, each overriding draw(). In main(), use a base-class pointer to a derived object and call draw() to demonstrate runtime polymorphism.',
    starterCode:
      '#include <iostream>\nusing namespace std;\n\nclass Shape {\npublic:\n    virtual void draw() {\n        // base implementation\n    }\n    virtual ~Shape() {}\n};\n\nclass Circle : public Shape {\npublic:\n    // override draw()\n};\n\nclass Square : public Shape {\npublic:\n    // override draw()\n};\n\nint main() {\n    Shape* s;\n    // Demonstrate polymorphism\n    return 0;\n}',
    testCases: [
      { input: 'circle', expected: 'Drawing circle' },
      { input: 'square', expected: 'Drawing square' },
    ],
    hint: 'Use the `virtual` keyword in the base class and override in derived classes.',
    ioExample: { input: 'circle', output: 'Drawing circle' },
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  basic_syntax: 'Basic Syntax',
  classes: 'Classes',
  constructors: 'Constructors',
  function_overloading: 'Function Overloading',
  inheritance: 'Inheritance',
  polymorphism: 'Polymorphism',
  operator_overloading: 'Operator Overloading',
  templates: 'Templates',
  stl: 'STL',
  pointers: 'Pointers',
}

const DIFFICULTY_STYLES: Record<Challenge['difficulty'], { label: string; className: string }> = {
  easy: { label: 'Easy', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  medium: { label: 'Medium', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  hard: { label: 'Hard', className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
}

function draftKey(challengeId: string) {
  return `lernio-coding-draft:${challengeId}`
}

function getStoredDraft(challengeId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(draftKey(challengeId))
  } catch {
    return null
  }
}

function setStoredDraft(challengeId: string, code: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(draftKey(challengeId), code)
  } catch {
    // ignore quota errors
  }
}

function clearStoredDraft(challengeId: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(draftKey(challengeId))
  } catch {
    // ignore
  }
}

function formatCppCode(code: string): string {
  // Simple format: normalise trailing whitespace, collapse 3+ blank lines to 2, ensure newline at EOF.
  const lines = code.replace(/\t/g, '    ').split('\n')
  let depth = 0
  const out: string[] = []
  for (const raw of lines) {
    const trimmed = raw.trim()
    // If a line starts with }, dedent first
    if (trimmed.startsWith('}')) depth = Math.max(0, depth - 1)
    const indent = '    '.repeat(depth)
    out.push(trimmed.length === 0 ? '' : indent + trimmed)
    // Count braces on this line for next depth
    const opens = (trimmed.match(/{/g) || []).length
    const closes = (trimmed.match(/}/g) || []).length
    depth = Math.max(0, depth + opens - closes)
  }
  // Collapse 3+ blanks
  const joined = out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
  return joined
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function CodingView() {
  const [challenges, setChallenges] = useState<Challenge[]>(BUILTIN_CHALLENGES)
  const [sourceLabel, setSourceLabel] = useState<'database' | 'builtin-demo'>('builtin-demo')
  const [loadingChallenges, setLoadingChallenges] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [code, setCode] = useState<string>('')
  const [draftSaved, setDraftSaved] = useState(false)
  const [runResult, setRunResult] = useState<RunResult>({
    status: 'idle', message: '', syntax: null,
  })
  const [activeTab, setActiveTab] = useState<'preview' | 'issues' | 'about'>('preview')
  const [mascotState, setMascotState] = useState<MascotState>('idle')
  const [mascotMessage, setMascotMessage] = useState<string>(
    "Let's write some C++! Pick a challenge or start coding. Use “Syntax Preview” to check your code's structure."
  )
  const [running, setRunning] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiResponse, setAiResponse] = useState<string>('')
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [resetFlash, setResetFlash] = useState(false)

  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const lineNumbersRef = useRef<HTMLDivElement | null>(null)

  // ---- Fetch challenges from the API (fall back to built-ins only if empty) ----
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/coding')
        const json = await res.json()
        if (mounted && json.ok && Array.isArray(json.data) && json.data.length > 0) {
          // Map DB shape → local Challenge shape. The API strips testCases &
          // solutionCode, so DB challenges have neither — that's intentional.
          const mapped: Challenge[] = json.data.map((c: ApiChallengeRow) => ({
            id: c.id,
            title: c.title,
            category: c.category || 'basic_syntax',
            difficulty: (c.difficulty || 'easy') as Challenge['difficulty'],
            description: c.description || '',
            starterCode: c.starterCode || '',
            timeLimitMs: c.timeLimitMs,
            memoryLimitKB: c.memoryLimitKB,
            status: c.status,
            sourceEvidence: c.sourceEvidence,
            curriculum: c.curriculum,
            isBuiltin: false,
          }))
          setChallenges(mapped)
          setSourceLabel('database')
        } else {
          // API returned empty — use the built-in demo set.
          setChallenges(BUILTIN_CHALLENGES)
          setSourceLabel('builtin-demo')
        }
      } catch {
        // Network / server error — fall back to built-ins so the lab stays usable.
        if (mounted) {
          setChallenges(BUILTIN_CHALLENGES)
          setSourceLabel('builtin-demo')
        }
      } finally {
        if (mounted) setLoadingChallenges(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // ---- When a challenge is selected, load draft or starter code ----
  const loadChallenge = useCallback((challenge: Challenge) => {
    setSelectedId(challenge.id)
    const draft = getStoredDraft(challenge.id)
    setCode(draft ?? challenge.starterCode)
    setRunResult({ status: 'idle', message: '', syntax: null })
    setActiveTab('preview')
    setMascotState('idle')
    setMascotMessage(`Loaded “${challenge.title}”. Read the description, then write your solution. Use “Syntax Preview” to check your code's structure — it does NOT run your code.`)
    setAiResponse('')
    // focus editor
    setTimeout(() => editorRef.current?.focus(), 50)
  }, [])

  // ---- Editor scroll sync with line numbers ----
  const handleEditorScroll = useCallback(() => {
    if (editorRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = editorRef.current.scrollTop
    }
  }, [])

  // ---- Tab key inserts 2 spaces ----
  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.currentTarget
      const start = el.selectionStart
      const end = el.selectionEnd
      const next = code.slice(0, start) + '  ' + code.slice(end)
      setCode(next)
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2
      })
    }
  }, [code])

  // ---- Auto-save draft (debounced via effect) ----
  useEffect(() => {
    if (!selectedId) return
    if (code === '') return
    setStoredDraft(selectedId, code)
    const id = setTimeout(() => setDraftSaved(true), 200)
    const clear = setTimeout(() => setDraftSaved(false), 1500)
    return () => { clearTimeout(id); clearTimeout(clear) }
  }, [code, selectedId])

  // ---- Syntax Preview (was "Run") ----
  // HONEST: this calls the API's run path, which only does a LOCAL static
  // check (matching braces, presence of int main(), return 0;). It NEVER
  // executes the code, NEVER compares against test cases, and NEVER awards XP.
  // The UI must therefore NEVER show "test cases passed".
  const handleSyntaxPreview = useCallback(async () => {
    if (!code.trim()) {
      setMascotState('warning')
      setMascotMessage('Your editor looks empty. Write some code first, then preview its syntax.')
      return
    }
    setRunning(true)
    setMascotState('thinking')
    setMascotMessage('Checking your code structure… (this is a local syntax preview, not a real run)')
    setActiveTab('preview')
    setRunResult((r) => ({ ...r, status: 'running' }))

    try {
      const res = await fetch('/api/coding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'cpp' }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error?.message || 'Preview failed')

      const data = json.data as ApiRunResponse
      const syntax: SyntaxCheck = {
        ok: data.syntax?.ok ?? false,
        issues: data.syntax?.issues ?? [],
      }
      const status: RunResult['status'] = syntax.ok ? 'preview_ok' : 'preview_issues'
      setRunResult({
        status,
        message: data.message || (syntax.ok
          ? 'No structural issues detected. This is NOT a compile or test run.'
          : 'Structural issues found — see the Issues tab.'),
        syntax,
      })

      if (syntax.ok) {
        setMascotState('hinting')
        setMascotMessage('Structure looks fine, but remember this only checks braces, main(), and return. Use Submit for reviewed test execution when the runner is configured.')
      } else {
        setMascotState('error')
        setMascotMessage(`Found ${syntax.issues.length} structural issue(s). Check the Issues tab — these are quick fixes.`)
        setActiveTab('issues')
      }
    } catch (e) {
      setRunResult({
        status: 'error',
        message: `Could not run the syntax preview: ${e instanceof Error ? e.message : String(e)}`,
        syntax: null,
      })
      setMascotState('error')
      setMascotMessage('Something went wrong reaching the preview service. Try again in a moment.')
      setActiveTab('preview')
    } finally {
      setRunning(false)
    }
  }, [code])

  // ---- Submit ----
  // Runs reviewed tests only when the server has a trusted runner configured.
  // Otherwise the API saves the submission for manual review without awarding XP.
  const handleSaveDraft = useCallback(async () => {
    if (!code.trim()) {
      setMascotState('warning')
      setMascotMessage('Your editor is empty. Write some code before saving a draft.')
      return
    }
    if (!selectedId) {
      setMascotState('warning')
      setMascotMessage('Pick a challenge first so your draft is linked to it.')
      return
    }
    setRunning(true)
    setMascotState('thinking')
    setMascotMessage('Saving your code as a draft… (real test scoring needs the code runner)')
    setActiveTab('preview')
    setRunResult((r) => ({ ...r, status: 'running' }))

    try {
      const res = await fetch('/api/coding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: selectedId, code, language: 'cpp' }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error?.message || 'Save failed')

      const data = json.data as ApiSubmitResponse
      const resultStatus: RunResult['status'] = data.status === 'executed'
        ? data.passed
          ? 'passed'
          : data.runnerStatus === 'failed'
            ? 'failed'
            : 'runner_error'
        : 'draft_saved'
      setRunResult({
        status: resultStatus,
        message: data.message || 'Code saved as a draft. Real test scoring requires the production code runner.',
        syntax: null,
        xpGain: data.xpGain,
        testResults: data.testResults,
      })
      if (resultStatus === 'passed') {
        setMascotState('greeting')
        setMascotMessage(data.xpGain > 0 ? `All reviewed tests passed. XP gained: ${data.xpGain}.` : 'All reviewed tests passed.')
      } else if (resultStatus === 'failed') {
        setMascotState('hinting')
        setMascotMessage('The runner finished, but at least one reviewed test failed. Read the output and revise your solution.')
      } else if (resultStatus === 'runner_error') {
        setMascotState('error')
        setMascotMessage('The code runner could not complete this submission. Your code was saved for review.')
      } else {
        setMascotState('idle')
        setMascotMessage('Draft saved. Your code is stored on your account for manual review.')
      }
    } catch (e) {
      setRunResult({
        status: 'error',
        message: `Could not save your draft: ${e instanceof Error ? e.message : String(e)}`,
        syntax: null,
      })
      setMascotState('error')
      setMascotMessage('Could not save your draft. Try again in a moment.')
      setActiveTab('preview')
    } finally {
      setRunning(false)
    }
  }, [code, selectedId])

  // ---- Toolbar actions ----
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }, [code])

  const handleReset = useCallback(() => {
    const challenge = challenges.find((c) => c.id === selectedId)
    if (!challenge) return
    setCode(challenge.starterCode)
    clearStoredDraft(challenge.id)
    setResetFlash(true)
    setTimeout(() => setResetFlash(false), 1200)
    setMascotState('idle')
    setMascotMessage('Editor reset to starter code. Fresh start!')
  }, [challenges, selectedId])

  const handleFormat = useCallback(() => {
    setCode((c) => formatCppCode(c))
    setMascotState('hinting')
    setMascotMessage('Reformatted indentation. Easier to read now.')
  }, [])

  const handleSaveLocalDraft = useCallback(() => {
    if (!selectedId) return
    setStoredDraft(selectedId, code)
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 1800)
    setMascotState('idle')
    setMascotMessage('Draft saved to your browser. You can come back to this challenge later.')
  }, [code, selectedId])

  // ---- AI help (pre-built smart responses) ----
  const callAiHelp = useCallback(async (mode: 'explain_error' | 'hint' | 'explain_code' | 'suggest_test') => {
    setAiLoading(mode)
    setAiOpen(true)
    setAiResponse('')
    const challenge = challenges.find((c) => c.id === selectedId) || null
    // Simulate brief thinking so UX feels responsive
    await new Promise((r) => setTimeout(r, 450))

    let response = ''
    if (mode === 'explain_error') {
      const issues = runResult.syntax?.issues ?? []
      if (issues.length > 0) {
        response = explainSyntaxIssues(issues, code)
      } else if (runResult.status === 'preview_ok') {
        response =
          `Your code passed the structural preview (braces match, main() present, return 0; found).\n\n` +
          `BUT this is NOT a compile or test run — it only checks structure. Real correctness can only be verified once the sandboxed code runner is connected. Common things the preview can't catch:\n` +
          `1. Type errors and undeclared identifiers\n` +
          `2. Off-by-one or logic errors\n` +
          `3. Wrong output format\n\n` +
          `Read your code carefully line-by-line, and trace it with the example input before relying on it.`
      } else {
        response =
          `No issues to explain yet. Click “Syntax Preview” first — I'll walk you through any structural problems it finds.`
      }
    } else if (mode === 'hint') {
      response = challenge
        ? `Hint for “${challenge.title}”:\n\n${challenge.hint ?? 'Break the problem into smaller steps and handle one at a time.'}\n\n` +
          `Think about it before reading any solution. If you're still stuck after 5 minutes, ask me to “explain this code” with your current attempt.`
        : `Pick a challenge first, and I'll give you a targeted hint for that problem.`
    } else if (mode === 'explain_code') {
      response = explainCode(code, challenge)
    } else if (mode === 'suggest_test') {
      response = suggestTestCases(challenge)
    }
    setAiResponse(response)
    setAiLoading(null)
  }, [runResult, code, challenges, selectedId])

  const selectedChallenge = useMemo(
    () => challenges.find((c) => c.id === selectedId) || null,
    [challenges, selectedId]
  )

  const lineCount = useMemo(() => Math.max(code.split('\n').length, 1), [code])

  const issueCount = runResult.syntax?.issues.length ?? 0

  return (
    <div className="space-y-4">
      {/* Honest banner — top of the lab */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
        role="note"
      >
        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
          <span className="font-semibold">Syntax-learning playground.</span>{' '}
          This lab checks your code&apos;s structure locally — it does <span className="font-semibold">not</span> compile
          or execute it. Submit uses a trusted production runner when configured; otherwise the code is saved for
          manual review. No XP is awarded for previews or unexecuted drafts.
        </div>
      </motion.div>

      {/* Header row with Coda mascot */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4 md:p-5"
      >
        <div className="flex items-start gap-4">
          <Mascot mascot="coda" state={mascotState} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl font-bold">C++ Coding Lab</h1>
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                <Cpu className="h-3 w-3" /> OOP with C++
              </Badge>
              {sourceLabel === 'builtin-demo' ? (
                <Badge variant="outline" className="text-meta border-amber-500/40 text-amber-600 dark:text-amber-400">
                  built-in demo challenges
                </Badge>
              ) : (
                <Badge variant="outline" className="text-meta border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                  DB challenges
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {mascotMessage}
            </p>
          </div>
          <div className="hidden md:flex flex-col gap-1.5 items-end">
            <Badge variant="outline" className="font-mono text-meta">syntax preview</Badge>
            <span className="text-meta text-muted-foreground">runner-gated submit</span>
          </div>
        </div>
      </motion.div>

      {/* Main grid: left challenges (5fr) | right editor (7fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-4">
        {/* ---------------- LEFT PANEL: Challenges ---------------- */}
        <div className="space-y-4">
          <Card className="border-amber-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <ListChecks className="h-4 w-4 text-amber-500" />
                  </div>
                  <CardTitle className="text-base">Challenges</CardTitle>
                </div>
                <Badge variant="secondary" className="text-meta">{challenges.length} total</Badge>
              </div>
              <CardDescription className="text-xs">
                {sourceLabel === 'database'
                  ? 'Curated C++ challenges from your course database. Each has hidden test cases (checked server-side once the runner is live).'
                  : 'Built-in demo challenges — the database returned no rows, so these client-side demos are shown. They are for practice only.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingChallenges ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-26rem)] pr-3">
                  <div className="space-y-2">
                    {challenges.map((c) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        selected={c.id === selectedId}
                        onSelect={() => loadChallenge(c)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Selected challenge detail */}
          {selectedChallenge && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base leading-tight">{selectedChallenge.title}</CardTitle>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline" className="text-meta">
                        {CATEGORY_LABELS[selectedChallenge.category] || selectedChallenge.category}
                      </Badge>
                      <Badge variant="outline" className={cn('text-meta', DIFFICULTY_STYLES[selectedChallenge.difficulty].className)}>
                        {DIFFICULTY_STYLES[selectedChallenge.difficulty].label}
                      </Badge>
                      {selectedChallenge.isBuiltin && (
                        <Badge variant="outline" className="text-meta border-amber-500/40 text-amber-600 dark:text-amber-400">
                          demo
                        </Badge>
                      )}
                      {selectedChallenge.curriculum?.subjectCode && (
                        <Badge variant="outline" className="text-meta border-sky-500/40 text-sky-600 dark:text-sky-400">
                          {selectedChallenge.curriculum.subjectCode}
                        </Badge>
                      )}
                      {selectedChallenge.curriculum?.unitNumber != null && (
                        <Badge variant="outline" className="text-meta border-violet-500/40 text-violet-600 dark:text-violet-400">
                          Unit {selectedChallenge.curriculum.unitNumber}
                        </Badge>
                      )}
                      {selectedChallenge.curriculum?.lessonTitle && (
                        <Badge variant="outline" className="text-meta border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                          lesson-linked
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {selectedChallenge.description}
                </p>

                {selectedChallenge.curriculum?.lessonTitle ? (
                  <p className="text-xs text-muted-foreground">
                    Lesson: <span className="font-medium text-foreground">{selectedChallenge.curriculum.lessonTitle}</span>
                  </p>
                ) : selectedChallenge.curriculum?.subjectName ? (
                  <p className="text-xs text-muted-foreground">
                    Subject: <span className="font-medium text-foreground">{selectedChallenge.curriculum.subjectName}</span>
                  </p>
                ) : null}

                {selectedChallenge.ioExample && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <p className="text-meta font-semibold text-muted-foreground uppercase tracking-wide">Example</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-meta text-muted-foreground">Input</p>
                        <pre className="font-mono mt-1 whitespace-pre-wrap break-words">{selectedChallenge.ioExample.input}</pre>
                      </div>
                      <div>
                        <p className="text-meta text-muted-foreground">Output</p>
                        <pre className="font-mono mt-1 whitespace-pre-wrap break-words">{selectedChallenge.ioExample.output}</pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Honest limits / test info */}
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">Runner config</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-meta text-muted-foreground">
                    <div>
                      Time limit:{' '}
                      <span className="font-mono text-foreground">{selectedChallenge.timeLimitMs ?? 5000} ms</span>
                    </div>
                    <div>
                      Memory limit:{' '}
                      <span className="font-mono text-foreground">
                        {((selectedChallenge.memoryLimitKB ?? 256000) / 1000).toFixed(0)} MB
                      </span>
                    </div>
                  </div>
                  <p className="text-meta text-muted-foreground italic pt-0.5">
                    Test cases (visible + hidden) are stored server-side and evaluated only when the sandboxed runner is connected. Your code is never auto-scored in this build.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ---------------- RIGHT PANEL: Editor + Output + AI ---------------- */}
        <div className="space-y-4">
          {/* Editor card */}
          <Card className="overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/30 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge className="bg-zinc-800 text-zinc-100 hover:bg-zinc-800 font-mono">
                  <Code2 className="h-3 w-3" /> C++
                </Badge>
                <span className="text-meta text-muted-foreground hidden sm:inline">
                  {lineCount} lines · {code.length} chars
                </span>
                {draftSaved && (
                  <span className="text-meta text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> saved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="h-7 px-2 text-xs gap-1"
                  title="Copy code"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Copy</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleFormat}
                  className="h-7 px-2 text-xs gap-1"
                  title="Format indentation"
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Format</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  className={cn(
                    'h-7 px-2 text-xs gap-1',
                    resetFlash && 'text-amber-500'
                  )}
                  title="Reset to starter code"
                  disabled={!selectedChallenge}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveLocalDraft}
                  className="h-7 px-2 text-xs gap-1"
                  title="Save draft to browser"
                  disabled={!selectedChallenge}
                >
                  <Save className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
                <div className="w-px h-5 bg-border mx-1" />

                {/* Syntax Preview (was "Run") — honest label + tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSyntaxPreview}
                      disabled={running}
                      className="h-7 px-3 text-xs gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                    >
                      {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      Syntax Preview
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[240px]">
                    <p className="font-medium">Syntax Preview</p>
                    <p className="text-muted-foreground text-meta mt-0.5">
                      Checks basic C++ structure (braces, main(), return) locally. Does NOT compile or execute your code.
                    </p>
                  </TooltipContent>
                </Tooltip>

                {/* Submit through the configured runner, or save for review if execution is unavailable. */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={handleSaveDraft}
                      disabled={running || !selectedChallenge}
                      className="h-7 px-3 text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Submit
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[240px]">
                    <p className="font-medium">Submit</p>
                    <p className="text-muted-foreground text-meta mt-0.5">
                      Runs reviewed tests when the production runner is configured; otherwise saves your code for manual review.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Editor body: line numbers + textarea */}
            <div className="relative flex bg-zinc-900" style={{ height: 'min(60vh, 480px)' }}>
              <div
                ref={lineNumbersRef}
                aria-hidden="true"
                className="select-none overflow-hidden bg-zinc-950/60 text-zinc-600 font-mono text-xs leading-6 py-3 pl-3 pr-2 text-right border-r border-zinc-800"
                style={{ minWidth: '3rem' }}
              >
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i} className="h-6">{i + 1}</div>
                ))}
              </div>
              <textarea
                ref={editorRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onScroll={handleEditorScroll}
                onKeyDown={handleEditorKeyDown}
                spellCheck={false}
                placeholder="// Start typing your C++ code here…"
                className="flex-1 resize-none bg-zinc-900 text-zinc-100 font-mono text-xs leading-6 py-3 px-3 outline-none caret-amber-400 placeholder:text-zinc-600"
                style={{ tabSize: 2 }}
              />
            </div>

            {/* Status strip */}
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-800 bg-zinc-950 text-meta text-zinc-500 font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Terminal className="h-3 w-3" /> main.cpp
                </span>
                <span>UTF-8</span>
                <span>LF</span>
              </div>
              <div className="flex items-center gap-2">
                {runResult.status === 'running' && <span className="text-amber-400">● checking…</span>}
                {runResult.status === 'preview_ok' && <span className="text-emerald-400">● structure ok</span>}
                {runResult.status === 'preview_issues' && <span className="text-amber-400">● {issueCount} issue(s)</span>}
                {runResult.status === 'draft_saved' && <span className="text-sky-400">● draft saved</span>}
                {runResult.status === 'passed' && <span className="text-emerald-400">● passed</span>}
                {runResult.status === 'failed' && <span className="text-rose-400">● failed</span>}
                {runResult.status === 'runner_error' && <span className="text-amber-400">● runner error</span>}
                {runResult.status === 'error' && <span className="text-rose-400">● error</span>}
                {runResult.status === 'idle' && <span className="text-zinc-500">● idle</span>}
              </div>
            </div>
          </Card>

          {/* Output panel */}
          <Card>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <div className="flex items-center justify-between px-3 pt-3">
                <TabsList className="h-8">
                  <TabsTrigger value="preview" className="text-xs gap-1.5">
                    <Terminal className="h-3.5 w-3.5" /> Preview
                  </TabsTrigger>
                  <TabsTrigger value="issues" className="text-xs gap-1.5">
                    <Bug className="h-3.5 w-3.5" /> Issues
                    {issueCount > 0 && (
                      <span className="ml-1 text-meta rounded-full px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        {issueCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="about" className="text-xs gap-1.5">
                    <Info className="h-3.5 w-3.5" /> About
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Preview tab — the honest output area */}
              <TabsContent value="preview" className="mt-0 px-3 pb-3">
                <div className="rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs p-3 min-h-[160px] max-h-[320px] overflow-auto">
                  {running ? (
                    <div className="flex items-center gap-2 text-amber-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {selectedId ? 'Saving draft…' : 'Checking structure…'}
                    </div>
                  ) : runResult.status === 'idle' ? (
                    <div className="text-zinc-500 italic leading-relaxed">
                      <p className="mb-2">
                        Welcome to the C++ Coding Lab preview panel.
                      </p>
                      <p className="mb-2">
                        <span className="text-amber-400 not-italic font-semibold">Syntax Preview</span> checks your
                        code&apos;s structure locally — it confirms braces match, <code className="text-zinc-300">main()</code> is
                        present, and <code className="text-zinc-300">return 0;</code> exists. It does{' '}
                        <span className="not-italic font-semibold">not</span> compile or run your code.
                      </p>
                      <p>
                        <span className="text-amber-400 not-italic font-semibold">Submit</span> sends your code for
                        reviewed test execution when the production runner is configured. If execution is unavailable,
                        the submission is saved for manual review.
                      </p>
                    </div>
                  ) : runResult.message ? (
                    <div className="space-y-4">
                      <pre className="whitespace-pre-wrap break-words leading-relaxed font-mono">
                        {runResult.message}
                        {runResult.status === 'draft_saved' && (
                          <span className="block mt-2 text-zinc-500 font-sans text-xs">Status: saved as draft · passed: false · xp gained: 0</span>
                        )}
                        {runResult.status === 'passed' && (
                          <span className="block mt-2 text-emerald-400 font-bold font-sans text-xs">Status: passed · xp gained: {runResult.xpGain ?? 0}</span>
                        )}
                        {runResult.status === 'failed' && (
                          <span className="block mt-2 text-rose-400 font-bold font-sans text-xs">Status: failed · xp gained: 0</span>
                        )}
                        {runResult.status === 'runner_error' && (
                          <span className="block mt-2 text-amber-400 font-bold font-sans text-xs">Status: runner error · passed: false · xp gained: 0</span>
                        )}
                        {runResult.status === 'preview_ok' && (
                          <span className="block mt-2 text-zinc-500 font-sans text-xs">Note: this is a structural check only — not a compile or test run.</span>
                        )}
                      </pre>

                      {runResult.testResults && runResult.testResults.length > 0 && (
                        <div className="space-y-2 border-t border-zinc-800 pt-3 mt-3">
                          <p className="font-semibold text-zinc-300 font-sans text-xs">Test Case Execution Results:</p>
                          <div className="grid gap-2">
                            {runResult.testResults.map((tr) => (
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
                      )}
                    </div>
                  ) : (
                    <div className="text-zinc-500 italic">
                      Nothing to show yet.
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Issues tab — structural issues list (never fake test passes) */}
              <TabsContent value="issues" className="mt-0 px-3 pb-3">
                <div className="space-y-2 min-h-[160px] max-h-[320px] overflow-auto">
                  {running ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking structure…
                    </div>
                  ) : !runResult.syntax ? (
                    <div className="text-xs text-muted-foreground italic py-6 text-center">
                      No structural check has run yet. Click{' '}
                      <span className="text-amber-500 not-italic font-medium">Syntax Preview</span> to check your code.
                    </div>
                  ) : runResult.syntax.issues.length === 0 ? (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          No structural issues found
                        </span>
                      </div>
                      <p className="text-meta text-muted-foreground leading-relaxed">
                        Braces balance, <code className="font-mono">int main()</code> is present, and a{' '}
                        <code className="font-mono">return 0;</code> statement was found. This is a structural preview
                        only — it does <span className="font-semibold">not</span> prove your code compiles or produces
                        correct output.
                      </p>
                    </div>
                  ) : (
                    runResult.syntax.issues.map((issue, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-meta font-medium text-amber-700 dark:text-amber-400 mb-0.5">
                              Structural issue {i + 1}
                            </p>
                            <p className="text-xs text-foreground font-mono leading-relaxed break-words">
                              {issue}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* About tab — explains the honest state of the lab */}
              <TabsContent value="about" className="mt-0 px-3 pb-3">
                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <p className="font-semibold text-sm flex items-center gap-2">
                      <Info className="h-4 w-4 text-amber-500" /> How this lab works (honestly)
                    </p>
                    <p className="text-muted-foreground">
                      This lab keeps execution server-controlled. The app never runs student code inside Next.js; it
                      submits reviewed challenge tests only to a configured trusted runner.
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        <span className="font-medium text-foreground">Syntax Preview</span> — a local static check
                        (balanced braces, <code className="font-mono">int main()</code>, <code className="font-mono">return 0;</code>).
                        It does not compile or run anything.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">Submit</span> — executes reviewed tests when the
                        production runner is configured, otherwise saves your code for manual review.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">No fake passes</span> — this view never claims a
                        program passed unless the server validates a complete all-tests-passed runner response.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">XP gated</span> — XP is only awarded server-side by
                        the idempotent ledger for real, verified passes.
                      </li>
                    </ul>
                  </div>
                  {selectedChallenge && (
                    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                      <p className="font-medium">This challenge&apos;s runner config</p>
                      <div className="grid grid-cols-2 gap-2 text-meta text-muted-foreground">
                        <div>Time limit: <span className="font-mono text-foreground">{selectedChallenge.timeLimitMs ?? 5000} ms</span></div>
                        <div>Memory limit: <span className="font-mono text-foreground">{((selectedChallenge.memoryLimitKB ?? 256000) / 1000).toFixed(0)} MB</span></div>
                      </div>
                      <p className="text-meta text-muted-foreground italic">
                        Test cases (2 visible + 2 hidden per challenge) are stored on the server and evaluated only when the runner is wired up.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* AI Help panel — collapsible */}
          <Collapsible open={aiOpen} onOpenChange={setAiOpen}>
            <Card className="border-amber-500/20">
              <CollapsibleTrigger asChild>
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                  aria-expanded={aiOpen}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">AI Help from Coda</p>
                      <p className="text-meta text-muted-foreground">Explain structural issues, get hints, review your code</p>
                    </div>
                  </div>
                  {aiOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <AiHelpButton
                      icon={<Bug className="h-3.5 w-3.5" />}
                      label="Explain issues"
                      onClick={() => callAiHelp('explain_error')}
                      loading={aiLoading === 'explain_error'}
                      disabled={aiLoading !== null}
                    />
                    <AiHelpButton
                      icon={<Lightbulb className="h-3.5 w-3.5" />}
                      label="Give me a hint"
                      onClick={() => callAiHelp('hint')}
                      loading={aiLoading === 'hint'}
                      disabled={aiLoading !== null}
                    />
                    <AiHelpButton
                      icon={<FileCode className="h-3.5 w-3.5" />}
                      label="Explain this code"
                      onClick={() => callAiHelp('explain_code')}
                      loading={aiLoading === 'explain_code'}
                      disabled={aiLoading !== null}
                    />
                    <AiHelpButton
                      icon={<ListChecks className="h-3.5 w-3.5" />}
                      label="Suggest a test case"
                      onClick={() => callAiHelp('suggest_test')}
                      loading={aiLoading === 'suggest_test'}
                      disabled={aiLoading !== null}
                    />
                  </div>

                  {aiResponse && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                      <div className="flex items-start gap-2">
                        <Mascot mascot="coda" state="explaining" size={32} animated={false} />
                        <div className="flex-1 min-w-0">
                          <p className="text-meta font-semibold text-amber-600 dark:text-amber-400 mb-1">CODA</p>
                          <pre className="text-xs whitespace-pre-wrap break-words font-sans leading-relaxed text-foreground">
                            {aiResponse}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>

      {/* Empty-state nudge */}
      {!selectedChallenge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-3"
        >
          <Mascot mascot="coda" state="hinting" size={36} animated={false} />
          <p className="text-xs text-muted-foreground">
            Tip: Pick a challenge from the left to load its starter code, or just start typing in the editor to experiment freely. Your drafts are saved per challenge in this browser.
          </p>
        </motion.div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// API response shapes (the honest contract with /api/coding)
// ---------------------------------------------------------------------------

interface ApiChallengeRow {
  id: string
  title: string
  category: string
  difficulty: string
  description: string
  starterCode: string
  timeLimitMs: number
  memoryLimitKB: number
  status?: string
  sourceEvidence?: string | null
  curriculum?: ChallengeCurriculum
}

interface ApiRunResponse {
  status: 'syntax_preview'
  passed: false
  xpGain: 0
  syntax: { ok: boolean; issues: string[] }
  message: string
}

interface ApiSubmitResponse {
  status: 'not_executed' | 'executed'
  runnerStatus?: 'passed' | 'failed' | 'compile_error' | 'runtime_error' | 'timeout' | 'runner_error'
  passed: boolean
  xpGain: number
  message: string
  testResults?: Array<{
    index: number
    passed: boolean
    actual: string
    stderr: string | null
    durationMs: number | null
    memoryKB: number | null
  }>
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ChallengeCard({
  challenge,
  selected,
  onSelect,
}: {
  challenge: Challenge
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-lg border p-3 transition-all hover:shadow-sm',
        selected
          ? 'border-amber-500/50 bg-amber-500/5 shadow-sm'
          : 'border-border bg-card hover:border-amber-500/30'
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className={cn('text-sm font-medium leading-tight', selected && 'text-amber-600 dark:text-amber-400')}>
          {challenge.title}
        </p>
        <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', selected && 'text-amber-500')} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <Badge variant="outline" className="text-meta">
          {CATEGORY_LABELS[challenge.category] || challenge.category}
        </Badge>
        <Badge variant="outline" className={cn('text-meta', DIFFICULTY_STYLES[challenge.difficulty].className)}>
          {DIFFICULTY_STYLES[challenge.difficulty].label}
        </Badge>
        {challenge.isBuiltin && (
          <Badge variant="outline" className="text-meta border-amber-500/40 text-amber-600 dark:text-amber-400">
            demo
          </Badge>
        )}
        {challenge.curriculum?.subjectCode && (
          <Badge variant="outline" className="text-meta border-sky-500/40 text-sky-600 dark:text-sky-400">
            {challenge.curriculum.subjectCode}
          </Badge>
        )}
        {challenge.curriculum?.unitNumber != null && (
          <Badge variant="outline" className="text-meta border-violet-500/40 text-violet-600 dark:text-violet-400">
            Unit {challenge.curriculum.unitNumber}
          </Badge>
        )}
      </div>
      <p className="text-meta text-muted-foreground line-clamp-2 leading-relaxed">
        {challenge.description}
      </p>
      {challenge.curriculum?.lessonTitle && (
        <p className="mt-1 text-meta text-muted-foreground truncate">
          Lesson: {challenge.curriculum.lessonTitle}
        </p>
      )}
      <div className="mt-2 flex items-center gap-1.5">
        <span
          className={cn(
            'text-meta font-medium px-2 py-0.5 rounded-md',
            selected ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
          )}
        >
          {selected ? 'Loaded ✓' : 'Solve'}
        </span>
      </div>
    </button>
  )
}

function AiHelpButton({
  icon,
  label,
  onClick,
  loading,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  loading: boolean
  disabled: boolean
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="h-auto py-2 justify-start text-xs gap-2 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/40"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" /> : icon}
      <span className="truncate">{label}</span>
    </Button>
  )
}

// ---------------------------------------------------------------------------
// AI response generators (pre-built, context-aware)
// ---------------------------------------------------------------------------

function explainSyntaxIssues(issues: string[], code: string): string {
  let body = `I found ${issues.length} structural issue(s) in your code. Here's what each one means:\n\n`
  issues.forEach((issue, i) => {
    body += `${i + 1}. ${issue}\n`
    if (/main/i.test(issue)) {
      body += `   → Every C++ program needs an entry point called \`int main()\`. Without it, the compiler doesn't know where to start.\n`
      body += `   Fix: make sure your code contains \`int main() { ... return 0; }\`\n`
    } else if (/brace|unbalanced/i.test(issue)) {
      const opens = (code.match(/{/g) || []).length
      const closes = (code.match(/}/g) || []).length
      body += `   → Your curly braces don't match: ${opens} opening \`{\` vs ${closes} closing \`}\`.\n`
      body += `   Fix: look for a missing \`}\` near the end of a class or function. Class definitions must end with \`};\` (semicolon after the brace).\n`
    } else if (/return/i.test(issue)) {
      body += `   → \`main()\` should return 0 to signal success to the operating system.\n`
      body += `   Fix: add \`return 0;\` as the last statement inside \`main()\`.\n`
    }
    body += '\n'
  })

  body += `Remember: fixing these makes your code structurally valid, but the preview still can't tell you if your logic is correct. Trace through your code by hand with the example input to check the logic.\n`
  if (code.split('\n').length < 4) {
    body += `\nYour code is quite short — make sure you've written the full solution, not just the starter template.`
  }
  return body
}

function explainCode(code: string, challenge: Challenge | null): string {
  if (!code.trim()) {
    return `Your editor is empty. Write some code first, and I'll explain what each part does.`
  }
  const lines = code.split('\n')
  const hasInclude = /#include/.test(code)
  const hasClass = /\bclass\s+\w+/.test(code)
  const hasMain = /int\s+main\s*\(/.test(code)
  const hasCout = /cout/.test(code)
  const hasTemplate = /template\s*</.test(code)
  const hasVirtual = /\bvirtual\b/.test(code)
  const hasPointer = /(\*\w+|&\w+)/.test(code)

  let out = `Here's what your code does, section by section:\n\n`
  if (hasInclude) {
    const includes = lines.filter((l) => l.trim().startsWith('#include'))
    out += `1. **Headers** — You include ${includes.map((l) => l.trim()).join(', ')}. These bring in standard library features (input/output, strings, vectors, etc.).\n\n`
  }
  if (hasClass) {
    const classes = code.match(/\bclass\s+(\w+)/g) || []
    out += `2. **Class definition${classes.length > 1 ? 's' : ''}** — ${classes.map((c) => '`' + c + '`').join(', ')}. This${classes.length > 1 ? 's' : ''} define${classes.length > 1 ? '' : 's'} a blueprint with data members and member functions. Remember to end each class with \`};\`.\n\n`
  }
  if (hasTemplate) {
    out += `3. **Template** — You use \`template <typename T>\`, which lets the same function or class work with any data type. The compiler generates a specialised version for each type you use.\n\n`
  }
  if (hasVirtual) {
    out += `4. **Virtual function** — The \`virtual\` keyword enables runtime polymorphism. When you call \`draw()\` through a base-class pointer, the actual derived-class version runs.\n\n`
  }
  if (hasPointer) {
    out += `5. **Pointers** — You use \`*\` (dereference) and/or \`&\` (address-of). These directly read/write memory addresses — powerful, but easy to get wrong. Always initialise a pointer before dereferencing it.\n\n`
  }
  if (hasMain) {
    out += `${hasClass ? '6' : '1'}. **main() function** — This is where execution starts. It returns 0 to the OS to signal success.\n\n`
  }
  if (hasCout) {
    out += `${(hasClass ? 6 : 1) + 1}. **Output** — You use \`cout\` (character output) to print to the console. \`<<\` is the insertion operator.\n\n`
  }

  out += `\nNote: this is a static read of your code. I can't verify it actually compiles or produces the right output — only a configured trusted runner can do that.\n`
  if (challenge) {
    out += `\nIn the context of “${challenge.title}”: make sure your code actually solves the problem — ${challenge.hint?.toLowerCase() ?? 'break it into smaller steps.'}`
  }
  return out
}

function suggestTestCases(challenge: Challenge | null): string {
  if (!challenge) {
    return `Pick a challenge first, and I'll suggest edge cases you should think through before the runner is available.`
  }
  const suggestions: string[] = []
  suggestions.push(`• **Normal case** — the example given in the problem statement.`)

  if (challenge.difficulty === 'easy') {
    suggestions.push(`• **Boundary case** — smallest valid input (e.g. side = 1 for a square, n = 1 element).`)
    suggestions.push(`• **Typical case** — a mid-range value to confirm correctness.`)
  } else if (challenge.difficulty === 'medium') {
    suggestions.push(`• **Boundary case** — zero or minimum values where applicable.`)
    suggestions.push(`• **Negative input** — does your function handle negative numbers gracefully?`)
    suggestions.push(`• **Large input** — confirm there's no overflow (e.g. sum of many large numbers).`)
  } else {
    suggestions.push(`• **Null/empty input** — what if the list is empty, or the pointer is null?`)
    suggestions.push(`• **Edge case at limits** — INT_MAX, INT_MIN, very small fractions.`)
    suggestions.push(`• **Type mixing** — does your template function work for both \`int\` and \`double\`?`)
    suggestions.push(`• **Memory case** — check for leaks if you used \`new\` (always \`delete\` what you \`new\`).`)
  }

  return (
    `For “${challenge.title}”, here are test cases worth thinking through:\n\n` +
    suggestions.join('\n') +
    `\n\nOnce the sandboxed runner is connected, the hidden test cases will check exactly these kinds of edge behaviour — so designing them now (on paper) will save you a failed submission later.`
  )
}
