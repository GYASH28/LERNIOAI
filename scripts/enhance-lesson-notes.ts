#!/usr/bin/env tsx
/**
 * AI-Powered Lesson Note Enhancement Script
 * =========================================
 *
 * Expands short lesson-note JSON files in `content/lesson-notes/` so that every
 * lesson has textbook-quality theory (3,000–8,000 chars) plus additional
 * practice questions, flashcards, viva/interview/exam questions, worked
 * examples, callouts, exam tips, common mistakes, and mnemonics.
 *
 * The script is fully self-contained — it does NOT import from `src/lib/ai/*`
 * because those modules use the `server-only` marker that Next.js refuses to
 * load outside the App Router request lifecycle. Instead it makes direct HTTP
 * calls to the Gemini (preferred) and Groq (fallback) REST APIs using only the
 * standard `fetch` shipped with Node 24.
 *
 * USAGE
 * -----
 *   npx tsx scripts/enhance-lesson-notes.ts R23CP2406
 *   npx tsx scripts/enhance-lesson-notes.ts R23CP2406 --limit 5
 *   npx tsx scripts/enhance-lesson-notes.ts R23CP2406 --dry-run
 *   npx tsx scripts/enhance-lesson-notes.ts R23CP2406 --only os-introduction,process-management
 *   npx tsx scripts/enhance-lesson-notes.ts R23CP2406 --skip-theory   (skip theory expansion)
 *
 * Requires either GEMINI_API_KEY or GROQ_API_KEY in the environment (a project
 * root `.env` file is auto-loaded if present).
 *
 * The script:
 *   1. Loads `content/lesson-notes/<subject-code>*.json` (case-insensitive match)
 *   2. For every lesson where `theory.length < 3000`, asks the AI to expand the
 *      theory to 3,000–8,000 chars (skipped with --skip-theory).
 *   3. Asks the AI to top-up each content array (practiceQuestions, flashcards,
 *      vivaQuestions, interviewQuestions, examQuestions, workedExamples,
 *      callouts, examTips, commonMistakes, mnemonics) so the lesson meets the
 *      target counts listed below.
 *   4. Writes the updated JSON back to the same file (pretty-printed, 2-space).
 *   5. Logs per-lesson progress and a final summary.
 *
 * Failure handling: if an AI call fails for a lesson, the lesson is skipped
 * (existing content preserved) and the error is logged. The script continues
 * with the next lesson. A non-zero exit code is only emitted when the subject
 * JSON file itself cannot be found/read.
 *
 * TARGET COUNTS PER LESSON
 * ------------------------
 *   practiceQuestions : 5–8   (existing average ~3–4)
 *   flashcards        : 8–12  (existing average ~6–8)
 *   vivaQuestions     : 4–6   (existing average ~2–3)
 *   interviewQuestions: 3–5   (existing average ~2–3)
 *   examQuestions     : 3–5   (existing average ~2–3)
 *   workedExamples    : 3–5   (existing average ~1–2)
 *   callouts          : 5–8   (existing average ~3–6)
 *   examTips          : 5–8   (existing average ~3–5)
 *   commonMistakes    : 4–6   (existing average ~2–4)
 *   mnemonics         : 2–4   (existing average ~0–2)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

// ---------------------------------------------------------------------------
// Types — mirror the `Lesson` interface in src/lib/curriculum/lesson-notes-loader.ts
// but kept loose enough to handle older JSON files that predate V4 fields.
// ---------------------------------------------------------------------------

interface PracticeQuestion {
  question: string
  options: string[]
  answer: number
  explanation: string
}

interface MarkedQuestion {
  marks: number
  question: string
  modelAnswer?: string
  tips?: string[]
}

interface Mnemonic {
  phrase: string
  expansion: string
  meaning: string
}

interface Flashcard {
  front: string
  back: string
  hint?: string
}

interface WorkedExample {
  title: string
  problem: string
  solution: string
  explanation?: string
}

interface Callout {
  type: string
  title?: string
  content: string
}

interface Lesson {
  slug: string
  title: string
  durationMin: number
  difficulty: string
  overview: string
  keyConcepts: string[]
  formulas: string[]
  commonMistakes: string[]
  examTips: string[]
  practiceQuestions: PracticeQuestion[]
  objectives?: string[]
  prerequisites?: string[]
  theory?: string
  workedExamples?: WorkedExample[]
  vivaQuestions?: MarkedQuestion[]
  interviewQuestions?: MarkedQuestion[]
  examQuestions?: MarkedQuestion[]
  mnemonics?: Mnemonic[]
  callouts?: Callout[]
  flashcards?: Flashcard[]
  [key: string]: unknown
}

interface Unit {
  number: number
  title: string
  weightage: number
  lessons: Lesson[]
}

interface SubjectNotes {
  subjectCode: string
  subjectName: string
  semester: number
  credits: number
  units: Unit[]
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Target counts — the script tops-up each array up to the MINIMUM target.
// ---------------------------------------------------------------------------

const TARGETS = {
  practiceQuestions: 6,
  flashcards: 10,
  vivaQuestions: 5,
  interviewQuestions: 4,
  examQuestions: 4,
  workedExamples: 4,
  callouts: 7,
  examTips: 7,
  commonMistakes: 5,
  mnemonics: 3,
} as const

const THEORY_MIN = 3_000
const THEORY_MAX = 8_000

// ---------------------------------------------------------------------------
// Tiny .env loader (no external deps)
// ---------------------------------------------------------------------------

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return
  const raw = readFileSync(filePath, 'utf-8')
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
}

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

interface CliOptions {
  subjectCode: string
  limit: number | null
  dryRun: boolean
  skipTheory: boolean
  onlySlugs: Set<string> | null
}

function parseArgs(argv: string[]): CliOptions {
  const positional: string[] = []
  let limit: number | null = null
  let dryRun = false
  let skipTheory = false
  let onlySlugs: Set<string> | null = null

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--limit') {
      const v = Number(argv[i + 1])
      if (Number.isFinite(v) && v > 0) {
        limit = Math.round(v)
        i += 1
      } else {
        throw new Error(`--limit requires a positive number, got: ${argv[i + 1] ?? ''}`)
      }
    } else if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--skip-theory') {
      skipTheory = true
    } else if (arg === '--only') {
      const raw = argv[i + 1] ?? ''
      onlySlugs = new Set(
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      )
      i += 1
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`)
    } else {
      positional.push(arg)
    }
  }

  if (positional.length === 0) {
    throw new Error(
      'Usage: npx tsx scripts/enhance-lesson-notes.ts <SUBJECT_CODE> [--limit N] [--dry-run] [--skip-theory] [--only slug1,slug2]',
    )
  }

  return {
    subjectCode: positional[0],
    limit,
    dryRun,
    skipTheory,
    onlySlugs,
  }
}

// ---------------------------------------------------------------------------
// Subject file resolution (case-insensitive)
// ---------------------------------------------------------------------------

function findSubjectFile(subjectCode: string): string {
  const root = process.cwd()
  const notesDir = join(root, 'content', 'lesson-notes')
  if (!existsSync(notesDir)) {
    throw new Error(`Lesson notes directory not found: ${notesDir}`)
  }
  const target = subjectCode.toLowerCase()
  const files = readdirSync(notesDir).filter((f) => f.endsWith('.json'))
  const match = files.find((f) => f.toLowerCase().startsWith(`${target}-`))
  if (!match) {
    throw new Error(
      `No lesson-notes JSON file found for subject code "${subjectCode}" in ${notesDir}. ` +
        `Available prefixes: ${files.slice(0, 5).map((f) => f.split('-')[0]).join(', ')}…`,
    )
  }
  return join(notesDir, match)
}

// ---------------------------------------------------------------------------
// AI providers — direct REST calls
// ---------------------------------------------------------------------------

interface AiConfig {
  provider: 'gemini' | 'groq' | 'none'
  geminiKey: string
  geminiModel: string
  groqKey: string
  groqModel: string
}

function readAiConfig(): AiConfig {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() ?? ''
  const groqKey = process.env.GROQ_API_KEY?.trim() ?? ''
  const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash'
  const groqModel = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile'

  let provider: 'gemini' | 'groq' | 'none' = 'none'
  if (geminiKey) provider = 'gemini'
  else if (groqKey) provider = 'groq'

  return { provider, geminiKey, geminiModel, groqKey, groqModel }
}

async function callGemini(
  cfg: AiConfig,
  userPrompt: string,
  systemInstruction: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.geminiModel}:generateContent?key=${cfg.geminiKey}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.4,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 400)
    throw new Error(`GEMINI_HTTP_${res.status}: ${detail}`)
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text.trim()) throw new Error('GEMINI_EMPTY_RESPONSE')
  return text
}

async function callGroq(
  cfg: AiConfig,
  userPrompt: string,
  systemPrompt: string,
): Promise<string> {
  const url = 'https://api.groq.com/openai/v1/chat/completions'
  const body = {
    model: cfg.groqModel,
    temperature: 0.4,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.groqKey}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 400)
    throw new Error(`GROQ_HTTP_${res.status}: ${detail}`)
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const text = json.choices?.[0]?.message?.content ?? ''
  if (!text.trim()) throw new Error('GROQ_EMPTY_RESPONSE')
  return text
}

/**
 * Call the configured AI provider. Returns null on failure so the caller can
 * skip the lesson without crashing. The provider order is Gemini → Groq so the
 * long-context Gemini model handles theory expansion first.
 */
async function callAI(
  cfg: AiConfig,
  userPrompt: string,
  systemPrompt: string,
): Promise<string | null> {
  // Try Gemini first (if configured)
  if (cfg.provider === 'gemini') {
    try {
      return await withTimeout(
        callGemini(cfg, userPrompt, systemPrompt),
        60_000,
        'gemini',
      )
    } catch (err) {
      console.warn(
        `  ⚠️  Gemini call failed (${safeErr(err)}). Falling back to Groq…`,
      )
      // fall through to Groq if available
    }
  }
  if (cfg.groqKey) {
    try {
      return await withTimeout(
        callGroq(cfg, userPrompt, systemPrompt),
        60_000,
        'groq',
      )
    } catch (err) {
      console.warn(`  ⚠️  Groq call failed (${safeErr(err)}).`)
    }
  }
  return null
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT after ${ms}ms`)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

function safeErr(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 200)
  return String(err).slice(0, 200)
}

// ---------------------------------------------------------------------------
// JSON extraction (handle ```json fences + plain object)
// ---------------------------------------------------------------------------

function extractJsonObject(raw: string): unknown {
  let text = raw.trim()
  // Strip markdown fences if the model ignored response_format
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch) text = fenceMatch[1].trim()
  // Find the first balanced { ... } block
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in AI response')
  }
  const slice = text.slice(start, end + 1)
  return JSON.parse(slice)
}

// ---------------------------------------------------------------------------
// Enhancement prompt builder
// ---------------------------------------------------------------------------

interface EnhancementRequest {
  subjectName: string
  unitTitle: string
  lesson: Lesson
  expandTheory: boolean
  deficits: {
    practiceQuestions: number
    flashcards: number
    vivaQuestions: number
    interviewQuestions: number
    examQuestions: number
    workedExamples: number
    callouts: number
    examTips: number
    commonMistakes: number
    mnemonics: number
  }
}

function buildEnhancementPrompt(req: EnhancementRequest): {
  system: string
  user: string
} {
  const { lesson, subjectName, unitTitle, expandTheory, deficits } = req

  const system = [
    'You are LERNIO ContentForge — an expert academic author who writes',
    'textbook-quality lesson notes for Indian diploma engineering students',
    '(MSBTE / AICTE curriculum). You write in clear, exam-oriented English',
    'with Indian-context real-world examples (Indian Railways, ISRO, UPI',
    'payments, Tata Consultancy Services, Maruti Suzuki factories, etc.).',
    '',
    'STRICT CONTENT RULES:',
    '1. Write comprehensive, technically accurate content. NO filler, NO',
    '   repetition of the existing content, NO placeholder text like',
    '   "TODO" or "lorem ipsum".',
    '2. Include step-by-step explanations where the topic warrants them.',
    '3. Include real-world industrial applications (Indian engineering',
    '   context preferred).',
    '4. Include memory tricks / mnemonics only when they are genuinely',
    '   helpful — never invent nonsense acronyms.',
    '5. Include common mistakes students actually make in exams.',
    '6. For MCQs: the `options` array MUST have exactly 4 strings, and',
    '   `answer` MUST be a 0-based index into that array. The correct',
    '   option MUST be technically accurate.',
    '7. For marked questions (viva/interview/exam): `marks` is a positive',
    '   integer (3, 5, 7, or 10 are typical).',
    '8. Output STRICT JSON only — no prose, no markdown, no code fences.',
  ].join('\n')

  const existingSummary = {
    slug: lesson.slug,
    title: lesson.title,
    difficulty: lesson.difficulty,
    overview: lesson.overview,
    keyConcepts: lesson.keyConcepts,
    objectives: lesson.objectives ?? [],
    prerequisites: lesson.prerequisites ?? [],
    formulas: lesson.formulas,
    theoryLength: (lesson.theory ?? '').length,
    practiceQuestionCount: lesson.practiceQuestions?.length ?? 0,
    flashcardCount: lesson.flashcards?.length ?? 0,
    vivaCount: lesson.vivaQuestions?.length ?? 0,
    interviewCount: lesson.interviewQuestions?.length ?? 0,
    examCount: lesson.examQuestions?.length ?? 0,
    workedExampleCount: lesson.workedExamples?.length ?? 0,
    calloutCount: lesson.callouts?.length ?? 0,
    examTipCount: lesson.examTips?.length ?? 0,
    commonMistakeCount: lesson.commonMistakes?.length ?? 0,
    mnemonicCount: lesson.mnemonics?.length ?? 0,
  }

  // Trim existing theory to keep the prompt under 8k chars
  const existingTheory = (lesson.theory ?? '').slice(0, 4_000)
  // Trim existing arrays so the AI doesn't repeat them
  const existingPractice = (lesson.practiceQuestions ?? [])
    .slice(0, 4)
    .map((q) => ({ q: q.question, options: q.options, answer: q.answer }))
  const existingFlashcards = (lesson.flashcards ?? [])
    .slice(0, 6)
    .map((c) => ({ front: c.front, back: c.back }))
  const existingMistakes = (lesson.commonMistakes ?? []).slice(0, 4)
  const existingTips = (lesson.examTips ?? []).slice(0, 4)

  const user = [
    `Subject: ${subjectName}`,
    `Unit: ${unitTitle}`,
    `Lesson slug: ${lesson.slug}`,
    `Lesson title: ${lesson.title}`,
    `Difficulty: ${lesson.difficulty}`,
    '',
    '=== EXISTING LESSON SUMMARY ===',
    JSON.stringify(existingSummary, null, 2),
    '',
    '=== EXISTING THEORY (first 4000 chars) — DO NOT REPEAT, EXPAND IT ===',
    existingTheory || '(empty)',
    '',
    '=== EXISTING PRACTICE QUESTIONS (do not duplicate) ===',
    JSON.stringify(existingPractice, null, 2),
    '',
    '=== EXISTING FLASHCARDS (do not duplicate) ===',
    JSON.stringify(existingFlashcards, null, 2),
    '',
    '=== EXISTING COMMON MISTAKES (do not duplicate) ===',
    JSON.stringify(existingMistakes, null, 2),
    '',
    '=== EXISTING EXAM TIPS (do not duplicate) ===',
    JSON.stringify(existingTips, null, 2),
    '',
    '=== TASKS ===',
    expandTheory
      ? `1. Expand the lesson theory to between ${THEORY_MIN} and ${THEORY_MAX} characters. Return as "expandedTheory". Keep the existing content where it is correct, but enrich it with: introduction, definitions, detailed concept explanation, step-by-step worked reasoning, Indian-context real-world examples, industrial applications, and a brief summary. Use markdown-style headings (## Heading) and bullet points for readability.`
      : '1. (theory expansion skipped — set "expandedTheory" to null)',
    `2. Generate ${deficits.practiceQuestions} NEW practice questions (MCQs)`,
    `3. Generate ${deficits.flashcards} NEW flashcards`,
    `4. Generate ${deficits.vivaQuestions} NEW viva questions (with marks 3-5)`,
    `5. Generate ${deficits.interviewQuestions} NEW interview questions (with marks 5-10)`,
    `6. Generate ${deficits.examQuestions} NEW exam questions (with marks 5-10)`,
    `7. Generate ${deficits.workedExamples} NEW worked examples`,
    `8. Generate ${deficits.callouts} NEW callouts (type ∈ "info" | "warning" | "exam-tip" | "real-world" | "common-mistake" | "key-point")`,
    `9. Generate ${deficits.examTips} NEW exam tips (short, actionable sentences)`,
    `10. Generate ${deficits.commonMistakes} NEW common mistakes (short, specific)`,
    `11. Generate ${deficits.mnemonics} NEW mnemonics (only useful ones — set to empty array if none are appropriate)`,
    '',
    'If a deficit is 0, return an empty array for that key. Do NOT include',
    'existing items — only the NEW items you generated.',
    '',
    '=== OUTPUT JSON SCHEMA ===',
    'Return a single JSON object with EXACTLY these keys (no extras):',
    '{',
    '  "expandedTheory": string | null,',
    '  "additionalPracticeQuestions": [',
    '    { "question": string, "options": [string,string,string,string],',
    '      "answer": number (0-3), "explanation": string }',
    '  ],',
    '  "additionalFlashcards": [',
    '    { "front": string, "back": string, "hint": string (optional) }',
    '  ],',
    '  "additionalVivaQuestions": [',
    '    { "marks": number, "question": string,',
    '      "modelAnswer": string, "tips": [string] (optional) }',
    '  ],',
    '  "additionalInterviewQuestions": [',
    '    { "marks": number, "question": string,',
    '      "modelAnswer": string, "tips": [string] (optional) }',
    '  ],',
    '  "additionalExamQuestions": [',
    '    { "marks": number, "question": string,',
    '      "modelAnswer": string, "tips": [string] (optional) }',
    '  ],',
    '  "additionalWorkedExamples": [',
    '    { "title": string, "problem": string, "solution": string,',
    '      "explanation": string (optional) }',
    '  ],',
    '  "additionalCallouts": [',
    '    { "type": string, "title": string (optional), "content": string }',
    '  ],',
    '  "additionalExamTips": [string],',
    '  "additionalCommonMistakes": [string],',
    '  "additionalMnemonics": [',
    '    { "phrase": string, "expansion": string, "meaning": string }',
    '  ]',
    '}',
  ].join('\n')

  return { system, user }
}

// ---------------------------------------------------------------------------
// Enhancement application — merges AI output into the lesson
// ---------------------------------------------------------------------------

interface EnhancementResult {
  theoryUpdated: boolean
  counts: {
    practiceQuestions: number
    flashcards: number
    vivaQuestions: number
    interviewQuestions: number
    examQuestions: number
    workedExamples: number
    callouts: number
    examTips: number
    commonMistakes: number
    mnemonics: number
  }
}

function clampTheory(text: string): string {
  if (text.length <= THEORY_MAX) return text
  // Trim at the last paragraph break under the cap; else hard cap.
  const slice = text.slice(0, THEORY_MAX)
  const lastBreak = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'))
  return (lastBreak > THEORY_MIN ? slice.slice(0, lastBreak) : slice).trim()
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function applyEnhancement(
  lesson: Lesson,
  raw: string,
  expandTheory: boolean,
): EnhancementResult {
  const parsed = extractJsonObject(raw) as Record<string, unknown>

  // Theory expansion
  let theoryUpdated = false
  if (expandTheory) {
    const expanded = asString(parsed.expandedTheory).trim()
    if (expanded.length >= THEORY_MIN) {
      lesson.theory = clampTheory(expanded)
      theoryUpdated = true
    } else if (expanded.length > 0) {
      // Save what we got even if short — better than nothing.
      lesson.theory = clampTheory(expanded)
      theoryUpdated = true
    }
  }

  // Practice questions
  const pq = asArray<Record<string, unknown>>(parsed.additionalPracticeQuestions)
  for (const raw of pq) {
    const options = asArray<string>(raw.options)
    if (options.length !== 4) continue
    const answer = asNumber(raw.answer, -1)
    if (answer < 0 || answer > 3) continue
    const question = asString(raw.question)
    if (!question) continue
    lesson.practiceQuestions.push({
      question,
      options,
      answer,
      explanation: asString(raw.explanation) || 'See theory section above.',
    })
  }

  // Flashcards
  const fc = asArray<Record<string, unknown>>(parsed.additionalFlashcards)
  for (const raw of fc) {
    const front = asString(raw.front)
    const back = asString(raw.back)
    if (!front || !back) continue
    const card: Flashcard = { front, back }
    const hint = asString(raw.hint)
    if (hint) card.hint = hint
    if (!Array.isArray(lesson.flashcards)) lesson.flashcards = []
    lesson.flashcards.push(card)
  }

  // Helper for marked questions (viva / interview / exam)
  const pushMarked = (
    key: 'vivaQuestions' | 'interviewQuestions' | 'examQuestions',
    arr: unknown,
  ) => {
    const list = asArray<Record<string, unknown>>(arr)
    if (!Array.isArray(lesson[key])) lesson[key] = []
    for (const raw of list) {
      const question = asString(raw.question)
      if (!question) continue
      const item: MarkedQuestion = {
        marks: asNumber(raw.marks, 5),
        question,
      }
      const modelAnswer = asString(raw.modelAnswer)
      if (modelAnswer) item.modelAnswer = modelAnswer
      const tipsArr = asArray<string>(raw.tips)
      if (tipsArr.length > 0) item.tips = tipsArr
      lesson[key]!.push(item)
    }
  }

  pushMarked('vivaQuestions', parsed.additionalVivaQuestions)
  pushMarked('interviewQuestions', parsed.additionalInterviewQuestions)
  pushMarked('examQuestions', parsed.additionalExamQuestions)

  // Worked examples
  const we = asArray<Record<string, unknown>>(parsed.additionalWorkedExamples)
  if (!Array.isArray(lesson.workedExamples)) lesson.workedExamples = []
  for (const raw of we) {
    const title = asString(raw.title) || 'Worked example'
    const problem = asString(raw.problem)
    const solution = asString(raw.solution)
    if (!problem || !solution) continue
    const item: WorkedExample = { title, problem, solution }
    const explanation = asString(raw.explanation)
    if (explanation) item.explanation = explanation
    lesson.workedExamples.push(item)
  }

  // Callouts
  const co = asArray<Record<string, unknown>>(parsed.additionalCallouts)
  if (!Array.isArray(lesson.callouts)) lesson.callouts = []
  for (const raw of co) {
    const type = asString(raw.type) || 'info'
    const content = asString(raw.content)
    if (!content) continue
    const item: Callout = { type, content }
    const title = asString(raw.title)
    if (title) item.title = title
    lesson.callouts.push(item)
  }

  // Exam tips (string array)
  const et = asArray<string>(parsed.additionalExamTips).filter((s) => s.trim())
  lesson.examTips.push(...et)

  // Common mistakes (string array)
  const cm = asArray<string>(parsed.additionalCommonMistakes).filter((s) => s.trim())
  lesson.commonMistakes.push(...cm)

  // Mnemonics
  const mn = asArray<Record<string, unknown>>(parsed.additionalMnemonics)
  if (!Array.isArray(lesson.mnemonics)) lesson.mnemonics = []
  for (const raw of mn) {
    const phrase = asString(raw.phrase)
    const expansion = asString(raw.expansion)
    const meaning = asString(raw.meaning)
    if (!phrase || !expansion || !meaning) continue
    lesson.mnemonics.push({ phrase, expansion, meaning })
  }

  return {
    theoryUpdated,
    counts: {
      practiceQuestions: lesson.practiceQuestions.length,
      flashcards: lesson.flashcards?.length ?? 0,
      vivaQuestions: lesson.vivaQuestions?.length ?? 0,
      interviewQuestions: lesson.interviewQuestions?.length ?? 0,
      examQuestions: lesson.examQuestions?.length ?? 0,
      workedExamples: lesson.workedExamples?.length ?? 0,
      callouts: lesson.callouts?.length ?? 0,
      examTips: lesson.examTips.length,
      commonMistakes: lesson.commonMistakes.length,
      mnemonics: lesson.mnemonics?.length ?? 0,
    },
  }
}

// ---------------------------------------------------------------------------
// Per-lesson enhancement orchestration
// ---------------------------------------------------------------------------

function computeDeficits(lesson: Lesson) {
  return {
    practiceQuestions: Math.max(
      0,
      TARGETS.practiceQuestions - lesson.practiceQuestions.length,
    ),
    flashcards: Math.max(
      0,
      TARGETS.flashcards - (lesson.flashcards?.length ?? 0),
    ),
    vivaQuestions: Math.max(
      0,
      TARGETS.vivaQuestions - (lesson.vivaQuestions?.length ?? 0),
    ),
    interviewQuestions: Math.max(
      0,
      TARGETS.interviewQuestions - (lesson.interviewQuestions?.length ?? 0),
    ),
    examQuestions: Math.max(
      0,
      TARGETS.examQuestions - (lesson.examQuestions?.length ?? 0),
    ),
    workedExamples: Math.max(
      0,
      TARGETS.workedExamples - (lesson.workedExamples?.length ?? 0),
    ),
    callouts: Math.max(0, TARGETS.callouts - (lesson.callouts?.length ?? 0)),
    examTips: Math.max(0, TARGETS.examTips - lesson.examTips.length),
    commonMistakes: Math.max(
      0,
      TARGETS.commonMistakes - lesson.commonMistakes.length,
    ),
    mnemonics: Math.max(0, TARGETS.mnemonics - (lesson.mnemonics?.length ?? 0)),
  }
}

function hasDeficits(d: ReturnType<typeof computeDeficits>): boolean {
  return Object.values(d).some((n) => n > 0)
}

async function enhanceLesson(
  cfg: AiConfig,
  subjectName: string,
  unitTitle: string,
  lesson: Lesson,
  skipTheory: boolean,
): Promise<EnhancementResult | null> {
  const theoryLen = (lesson.theory ?? '').length
  const expandTheory = !skipTheory && theoryLen < THEORY_MIN
  const deficits = computeDeficits(lesson)

  // If theory is already long enough AND no array deficits, skip the AI call.
  if (!expandTheory && !hasDeficits(deficits)) {
    return {
      theoryUpdated: false,
      counts: {
        practiceQuestions: lesson.practiceQuestions.length,
        flashcards: lesson.flashcards?.length ?? 0,
        vivaQuestions: lesson.vivaQuestions?.length ?? 0,
        interviewQuestions: lesson.interviewQuestions?.length ?? 0,
        examQuestions: lesson.examQuestions?.length ?? 0,
        workedExamples: lesson.workedExamples?.length ?? 0,
        callouts: lesson.callouts?.length ?? 0,
        examTips: lesson.examTips.length,
        commonMistakes: lesson.commonMistakes.length,
        mnemonics: lesson.mnemonics?.length ?? 0,
      },
    }
  }

  const { system, user } = buildEnhancementPrompt({
    subjectName,
    unitTitle,
    lesson,
    expandTheory,
    deficits,
  })

  const raw = await callAI(cfg, user, system)
  if (!raw) return null

  try {
    return applyEnhancement(lesson, raw, expandTheory)
  } catch (err) {
    console.warn(
      `  ⚠️  Failed to parse AI response for "${lesson.slug}": ${safeErr(err)}`,
    )
    return null
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2))

  // Load .env from project root (lernio-audit/.env)
  loadEnvFile(join(process.cwd(), '.env'))

  const cfg = readAiConfig()
  if (cfg.provider === 'none') {
    console.error(
      '❌ No AI provider configured. Set GEMINI_API_KEY or GROQ_API_KEY in your environment or .env file.',
    )
    process.exitCode = 2
    return
  }

  console.warn(`\n🚀 LERNIO Lesson Note Enhancer`)
  console.warn(`   Subject code : ${opts.subjectCode}`)
  console.warn(`   AI provider  : ${cfg.provider}` + (cfg.provider === 'gemini' ? ` (model: ${cfg.geminiModel})` : ` (model: ${cfg.groqModel})`))
  if (cfg.provider === 'gemini' && cfg.groqKey) {
    console.warn(`   Fallback     : Groq (${cfg.groqModel})`)
  }
  console.warn(`   Dry run      : ${opts.dryRun ? 'yes' : 'no'}`)
  console.warn(`   Skip theory  : ${opts.skipTheory ? 'yes' : 'no'}`)
  if (opts.limit) console.warn(`   Limit        : ${opts.limit} lessons`)
  if (opts.onlySlugs) console.warn(`   Only slugs   : ${Array.from(opts.onlySlugs).join(', ')}`)
  console.warn('')

  const filePath = findSubjectFile(opts.subjectCode)
  const fileName = basename(filePath)
  console.warn(`📂 Loading ${fileName}`)

  const raw = readFileSync(filePath, 'utf-8')
  const subject = JSON.parse(raw) as SubjectNotes
  console.warn(`   Subject      : ${subject.subjectName} (${subject.subjectCode})`)
  console.warn(`   Units        : ${subject.units.length}`)

  // Flatten all lessons for processing
  const flat: Array<{ unit: Unit; lesson: Lesson }> = []
  for (const unit of subject.units) {
    for (const lesson of unit.lessons) {
      if (opts.onlySlugs && !opts.onlySlugs.has(lesson.slug)) continue
      flat.push({ unit, lesson })
    }
  }

  const limited = opts.limit ? flat.slice(0, opts.limit) : flat
  console.warn(`   Lessons      : ${limited.length} (of ${flat.length} matching)`)
  console.warn('')

  let processed = 0
  let enhanced = 0
  let failed = 0
  let skipped = 0

  for (const { unit, lesson } of limited) {
    processed += 1
    const theoryLen = (lesson.theory ?? '').length
    const deficits = computeDeficits(lesson)
    const needsTheory = !opts.skipTheory && theoryLen < THEORY_MIN
    const needsContent = hasDeficits(deficits)

    if (!needsTheory && !needsContent) {
      console.warn(
        `   [${processed}/${limited.length}] ✓ ${lesson.slug} — already meets targets (theory=${theoryLen})`,
      )
      skipped += 1
      continue
    }

    console.warn(
      `   [${processed}/${limited.length}] ⚙️  ${lesson.slug} — theory=${theoryLen} | deficits: ` +
        `pq+${deficits.practiceQuestions} fc+${deficits.flashcards} viva+${deficits.vivaQuestions} ` +
        `int+${deficits.interviewQuestions} exam+${deficits.examQuestions} we+${deficits.workedExamples} ` +
        `co+${deficits.callouts} et+${deficits.examTips} cm+${deficits.commonMistakes} mn+${deficits.mnemonics}`,
    )

    if (opts.dryRun) {
      skipped += 1
      continue
    }

    try {
      const result = await enhanceLesson(
        cfg,
        subject.subjectName,
        unit.title,
        lesson,
        opts.skipTheory,
      )
      if (!result) {
        console.warn(`      ❌ AI call failed — lesson skipped`)
        failed += 1
        continue
      }
      enhanced += 1
      const newTheoryLen = (lesson.theory ?? '').length
      console.warn(
        `      ✅ theory=${result.theoryUpdated ? `${theoryLen}→${newTheoryLen}` : 'skipped'} | ` +
          `pq=${result.counts.practiceQuestions} fc=${result.counts.flashcards} ` +
          `viva=${result.counts.vivaQuestions} int=${result.counts.interviewQuestions} ` +
          `exam=${result.counts.examQuestions} we=${result.counts.workedExamples} ` +
          `co=${result.counts.callouts} et=${result.counts.examTips} ` +
          `cm=${result.counts.commonMistakes} mn=${result.counts.mnemonics}`,
      )
    } catch (err) {
      console.warn(`      ❌ Unexpected error: ${safeErr(err)}`)
      failed += 1
    }
  }

  // Write back
  if (!opts.dryRun && enhanced > 0) {
    const out = JSON.stringify(subject, null, 2) + '\n'
    writeFileSync(filePath, out, 'utf-8')
    console.warn(`\n💾 Wrote updated JSON to ${fileName} (${out.length.toLocaleString()} bytes)`)
  } else if (opts.dryRun) {
    console.warn(`\n Dry run — no file written.`)
  } else {
    console.warn(`\n No lessons enhanced — file unchanged.`)
  }

  console.warn(`\n📊 Summary`)
  console.warn(`   Processed : ${processed}`)
  console.warn(`   Enhanced  : ${enhanced}`)
  console.warn(`   Skipped   : ${skipped}`)
  console.warn(`   Failed    : ${failed}`)
  console.warn('')
}

main().catch((err) => {
  console.error(`\n💥 Fatal error: ${err instanceof Error ? err.message : String(err)}`)
  process.exitCode = 1
})
