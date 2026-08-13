import { ApiError } from '@/lib/auth'
import { STUDENT_OS_STORAGE } from '@/lib/student-os/catalog'

const MAX_PAYLOAD_BYTES = 256_000
const MAX_NOTEBOOK_PAYLOAD_BYTES = 2_000_000
const MAX_NOTEBOOK_ENTRIES = 500

export interface StoredStateEnvelope {
  version: 1
  updatedAt: string
  value: unknown
}

interface NotebookLikeEntry {
  id: string
  updatedAt?: string
  createdAt?: string
  [key: string]: unknown
}

export function mergeStateValue(key: string, remote: unknown, incoming: unknown): unknown {
  if (remote === undefined) return incoming

  if (key === STUDENT_OS_STORAGE.notebook) return mergeNotebook(remote, incoming)
  if (key === STUDENT_OS_STORAGE.missions) return mergeMissionState(remote, incoming)
  if (key === STUDENT_OS_STORAGE.focus) {
    return mergeMonotonicCounters(remote, incoming, ['completedSessions', 'totalMinutes'])
  }
  if (isRecord(remote) && isRecord(incoming)) return { ...remote, ...incoming }
  return incoming
}

export function parseEnvelope(value: string): StoredStateEnvelope {
  try {
    const parsed = JSON.parse(value) as Partial<StoredStateEnvelope>
    if (
      parsed.version !== 1 ||
      typeof parsed.updatedAt !== 'string' ||
      Number.isNaN(Date.parse(parsed.updatedAt)) ||
      !Object.prototype.hasOwnProperty.call(parsed, 'value')
    ) {
      throw new Error('Invalid state envelope')
    }
    return parsed as StoredStateEnvelope
  } catch {
    throw new ApiError(
      'STATE_CORRUPTED',
      'Your synced Lernio state could not be read. Your device copy is still available.',
      409,
      false,
    )
  }
}

export function assertStudentStatePayloadSize(key: string, serialized: string) {
  const maxBytes = key === STUDENT_OS_STORAGE.notebook
    ? MAX_NOTEBOOK_PAYLOAD_BYTES
    : MAX_PAYLOAD_BYTES
  if (Buffer.byteLength(serialized, 'utf8') <= maxBytes) return
  throw new ApiError(
    'PAYLOAD_TOO_LARGE',
    'This Lernio state is too large to sync. Export or remove older entries and try again.',
    413,
    false,
  )
}

function mergeNotebook(remote: unknown, incoming: unknown) {
  const remoteEntries = Array.isArray(remote) ? remote.filter(isNotebookEntry) : []
  const incomingEntries = Array.isArray(incoming) ? incoming.filter(isNotebookEntry) : []
  const byId = new Map<string, NotebookLikeEntry>()

  for (const entry of [...remoteEntries, ...incomingEntries]) {
    const existing = byId.get(entry.id)
    if (!existing || entryTimestamp(entry) >= entryTimestamp(existing)) byId.set(entry.id, entry)
  }

  return [...byId.values()]
    .sort((a, b) => entryTimestamp(b) - entryTimestamp(a))
    .slice(0, MAX_NOTEBOOK_ENTRIES)
}

function mergeMissionState(remote: unknown, incoming: unknown) {
  if (!isRecord(remote)) return incoming
  if (!isRecord(incoming)) return remote
  const remoteDate = typeof remote.date === 'string' ? remote.date : ''
  const incomingDate = typeof incoming.date === 'string' ? incoming.date : ''
  if (remoteDate !== incomingDate) return incomingDate >= remoteDate ? incoming : remote

  const completed = new Set<string>([
    ...stringArray(remote.completed),
    ...stringArray(incoming.completed),
  ])
  return { ...remote, ...incoming, date: incomingDate || remoteDate, completed: [...completed] }
}

function mergeMonotonicCounters(remote: unknown, incoming: unknown, fields: string[]) {
  if (!isRecord(remote)) return incoming
  if (!isRecord(incoming)) return remote
  const merged: Record<string, unknown> = { ...remote, ...incoming }
  for (const field of fields) {
    merged[field] = Math.max(finiteNumber(remote[field]), finiteNumber(incoming[field]))
  }
  return merged
}

function isNotebookEntry(value: unknown): value is NotebookLikeEntry {
  return isRecord(value) && typeof value.id === 'string' && value.id.length > 0
}

function entryTimestamp(entry: NotebookLikeEntry) {
  const value = entry.updatedAt ?? entry.createdAt
  const timestamp = typeof value === 'string' ? Date.parse(value) : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
