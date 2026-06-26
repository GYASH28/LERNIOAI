import 'server-only'

import { db } from '@/lib/db'

const REDACTED_KEYS = new Set(['password', 'passwordHash', 'token', 'secret', 'apiKey', 'databaseUrl'])

export async function writeAuditEvent(input: {
  actorUserId?: string | null
  targetUserId?: string | null
  institutionId?: string | null
  departmentId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  summary?: string | null
  metadata?: Record<string, unknown> | null
}) {
  return db.auditEvent.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      institutionId: input.institutionId ?? null,
      departmentId: input.departmentId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary ?? null,
      metadata: input.metadata ? JSON.stringify(redact(input.metadata)) : null,
    },
  })
}

export function redact(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(redact)

  const output: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    output[key] = REDACTED_KEYS.has(key) ? '[redacted]' : redact(child)
  }
  return output
}
