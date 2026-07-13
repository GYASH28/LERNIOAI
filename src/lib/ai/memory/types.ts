import 'server-only'

// ---------------------------------------------------------------------------
// Conversation Memory System — shared type definitions.
//
// These types describe the data that flows between the four memory subsystems:
//   1. store        — CRUD for memories + summaries (DB rows)
//   2. summarizer   — compresses old messages into a flowing summary
//   3. extractor    — auto-extracts structured memories from user messages
//   4. retrieval    — assembles a `RetrievedContext` before each AI call
// ---------------------------------------------------------------------------

/** Category of a memory record. Stored verbatim in `TutorMemory.category`. */
export type MemoryCategory =
  | 'goal'
  | 'preference'
  | 'decision'
  | 'code_snippet'
  | 'file_ref'
  | 'fact'
  | 'deadline'
  | 'api_key_ref'
  | 'project_name'
  | 'constraint'
  | 'other'

/**
 * A memory that the extractor has pulled out of a user message but has not yet
 * been persisted. `importance` is on a 1–5 scale (5 = critical).
 */
export interface ExtractedMemory {
  category: MemoryCategory
  label: string
  content: string
  importance: number // 1-5
}

/**
 * Serialised view of a `TutorSessionSummary` row. Returned by the store and
 * used by the retrieval layer.
 */
export interface SessionSummary {
  id: string
  sessionId: string
  summary: string
  startIdx: number
  endIdx: number
  originalTokens: number
  summaryTokens: number
  createdAt: string
}

/**
 * Serialised view of a `TutorMemory` row. Returned by the store and surfaced
 * to the retrieval layer so it can be injected into the system prompt.
 */
export interface ConversationMemory {
  id: string
  sessionId: string
  category: MemoryCategory
  label: string
  content: string
  active: boolean
  importance: number
  createdAt: string
  updatedAt: string
}

/**
 * The assembled context handed to the AI provider before it generates a reply.
 * `recentMessages` carries the verbatim last N turns; `summaries` carries
 * compressed accounts of older conversation; `memories` are always-included
 * structured facts (goals, preferences, decisions, …).
 */
export interface RetrievedContext {
  /** Recent messages (full detail) — last N messages */
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  /** Summaries of older conversation portions */
  summaries: string[]
  /** Active memories relevant to this conversation */
  memories: ConversationMemory[]
  /** Total approximate token count of the assembled context */
  estimatedTokens: number
}

/**
 * Tunable knobs for the memory system. Each value can be overridden per-call
 * via a `Partial<MemoryConfig>` argument.
 */
export interface MemoryConfig {
  /** Max messages to keep in full detail (short-term memory) */
  shortTermLimit: number // default 20
  /** Max tokens for the full context (recent + summaries + memories) */
  maxContextTokens: number // default 30000
  /** Max tokens for a single message before truncation */
  maxMessageTokens: number // default 2000
  /** Number of messages to trigger summarization */
  summarizationThreshold: number // default 30
}

/** Default config used when the caller does not override any field. */
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  shortTermLimit: 20,
  maxContextTokens: 30_000,
  maxMessageTokens: 2_000,
  summarizationThreshold: 30,
}

/**
 * Merge a caller-supplied partial config into the defaults. Exported so every
 * module in the memory system derives its config from a single source of truth.
 */
export function resolveMemoryConfig(override?: Partial<MemoryConfig>): MemoryConfig {
  if (!override) return { ...DEFAULT_MEMORY_CONFIG }
  return {
    shortTermLimit:
      override.shortTermLimit ?? DEFAULT_MEMORY_CONFIG.shortTermLimit,
    maxContextTokens:
      override.maxContextTokens ?? DEFAULT_MEMORY_CONFIG.maxContextTokens,
    maxMessageTokens:
      override.maxMessageTokens ?? DEFAULT_MEMORY_CONFIG.maxMessageTokens,
    summarizationThreshold:
      override.summarizationThreshold ?? DEFAULT_MEMORY_CONFIG.summarizationThreshold,
  }
}

/** All category values, used for runtime validation of AI-extracted JSON. */
export const MEMORY_CATEGORIES: readonly MemoryCategory[] = [
  'goal',
  'preference',
  'decision',
  'code_snippet',
  'file_ref',
  'fact',
  'deadline',
  'api_key_ref',
  'project_name',
  'constraint',
  'other',
] as const

/** Returns true if `value` is a valid `MemoryCategory`. */
export function isMemoryCategory(value: unknown): value is MemoryCategory {
  return typeof value === 'string' && (MEMORY_CATEGORIES as readonly string[]).includes(value)
}
