import 'server-only'

import { db } from '@/lib/db'
import { ApiError, requireActiveRole } from '@/lib/auth'
import type { AuthorityContext } from '@/lib/authority'
import { resolveAcademicSubjectScope } from '@/lib/authority/workspace-data'
import type { Permission } from '@/lib/roles'

const LEARNING_OPS_ROLES = ['admin', 'reviewer', 'coordinator', 'teacher'] as const

const LEARNING_OPS_PREVIEW_PERMISSIONS = new Set<Permission>([
  'lessons.update',
  'lessons.review',
  'lessons.verify',
  'lessons.publish',
  'questions.update',
  'questions.review',
  'questions.publish',
  'resources.update',
  'resources.review',
  'resources.publish',
  'ai.content_draft',
  'ai.content_review',
])

export interface LearningOpsReportScope {
  all: boolean
  subjectCodes: readonly string[]
  programmeCodes: readonly string[]
  departmentCodes: readonly string[]
}

export interface LearningOpsAccess {
  authority: AuthorityContext
  subjectIds: readonly string[] | null
  reportScope: LearningOpsReportScope
  canManageProviders: boolean
  summary: string
}

export interface LearningOpsScopeMatchInput {
  subjectCode?: string | null
  officialSubjectCode?: string | null
  subjectCodes?: readonly (string | null | undefined)[] | null
  officialSubjectCodes?: readonly (string | null | undefined)[] | null
  programmeCode?: string | null
  programmeCodes?: readonly (string | null | undefined)[] | null
  departmentCode?: string | null
  departmentCodes?: readonly (string | null | undefined)[] | null
}

export async function requireLearningOpsPreviewAccess(): Promise<LearningOpsAccess> {
  const authority = await requireActiveRole(...LEARNING_OPS_ROLES)

  if (!canPreviewLearningOps(authority)) {
    throw new ApiError('FORBIDDEN', 'You do not have permission to preview learning operations.', 403, false)
  }

  if (authority.activeRoles.includes('admin')) {
    return {
      authority,
      subjectIds: null,
      reportScope: {
        all: true,
        subjectCodes: [],
        programmeCodes: [],
        departmentCodes: [],
      },
      canManageProviders: true,
      summary: 'Admin-wide learning operations preview.',
    }
  }

  const subjectIds = (await resolveAcademicSubjectScope(authority)) ?? []
  const reportScope = await resolveLearningOpsReportScope(subjectIds)

  if (subjectIds.length === 0 || !hasReportScope(reportScope)) {
    throw new ApiError('FORBIDDEN', 'Your learning operations role has no active academic scope.', 403, false)
  }

  return {
    authority,
    subjectIds,
    reportScope,
    canManageProviders: false,
    summary: learningOpsScopeSummary(reportScope),
  }
}

export async function requireLearningOpsResourceReviewAccess(resourceId: string): Promise<LearningOpsAccess> {
  const access = await requireLearningOpsPreviewAccess()
  if (access.subjectIds === null) return access

  if (
    !access.authority.capabilities.includes('resources.review') &&
    !access.authority.capabilities.includes('resources.publish')
  ) {
    throw new ApiError('FORBIDDEN', 'You do not have permission to review resources.', 403, false)
  }

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: { subjectId: true },
  })

  if (!resource) {
    throw new ApiError('NOT_FOUND', 'Resource not found.', 404, false)
  }

  if (!access.subjectIds.includes(resource.subjectId)) {
    throw new ApiError('FORBIDDEN', 'This resource is outside your review scope.', 403, false)
  }

  return access
}

export function canPreviewLearningOps(authority: AuthorityContext): boolean {
  if (authority.user.status === 'disabled') return false
  if (authority.activeRoles.includes('admin')) return true

  const hasOpsRole = authority.activeRoles.some((role) => LEARNING_OPS_ROLES.includes(role as (typeof LEARNING_OPS_ROLES)[number]))
  if (!hasOpsRole) return false

  const hasOpsCapability = authority.capabilities.some((capability) => LEARNING_OPS_PREVIEW_PERMISSIONS.has(capability))
  if (!hasOpsCapability) return false

  return (
    authority.scopeIndex.subjectIds.length > 0 ||
    authority.scopeIndex.departmentIds.length > 0 ||
    authority.scopeIndex.departmentCodes.length > 0 ||
    authority.scopeIndex.programmeIds.length > 0 ||
    authority.scopeIndex.semesterIds.length > 0 ||
    authority.scopeIndex.classGroupIds.length > 0
  )
}

export function matchesLearningOpsReportScope(
  scope: LearningOpsReportScope,
  input: LearningOpsScopeMatchInput,
): boolean {
  if (scope.all) return true

  const subjectCodes = normalizeCodes([
    input.subjectCode,
    input.officialSubjectCode,
    ...(input.subjectCodes ?? []),
    ...(input.officialSubjectCodes ?? []),
  ])
  const programmeCodes = normalizeCodes([
    input.programmeCode,
    ...(input.programmeCodes ?? []),
  ])
  const departmentCodes = normalizeCodes([
    input.departmentCode,
    ...(input.departmentCodes ?? []),
  ])

  return (
    overlaps(subjectCodes, scope.subjectCodes) ||
    overlaps(programmeCodes, scope.programmeCodes) ||
    overlaps(departmentCodes, scope.departmentCodes)
  )
}

export function learningOpsScopeSummary(scope: LearningOpsReportScope): string {
  if (scope.all) return 'Admin-wide learning operations preview.'

  const parts = [
    scope.subjectCodes.length ? `${scope.subjectCodes.length} subject${scope.subjectCodes.length === 1 ? '' : 's'}` : null,
    scope.programmeCodes.length ? `${scope.programmeCodes.length} programme${scope.programmeCodes.length === 1 ? '' : 's'}` : null,
    scope.departmentCodes.length ? `${scope.departmentCodes.length} department${scope.departmentCodes.length === 1 ? '' : 's'}` : null,
  ].filter(Boolean)

  return parts.length ? `Scoped learning operations preview: ${parts.join(', ')}.` : 'Scoped learning operations preview.'
}

async function resolveLearningOpsReportScope(subjectIds: readonly string[]): Promise<LearningOpsReportScope> {
  if (subjectIds.length === 0) {
    return { all: false, subjectCodes: [], programmeCodes: [], departmentCodes: [] }
  }

  const subjects = await db.subject.findMany({
    where: { id: { in: [...subjectIds] } },
    select: {
      code: true,
      scheme: {
        select: {
          programme: {
            select: {
              code: true,
              department: { select: { code: true } },
            },
          },
        },
      },
    },
  })

  return {
    all: false,
    subjectCodes: uniqueCodes(subjects.map((subject) => subject.code)),
    programmeCodes: uniqueCodes(subjects.map((subject) => subject.scheme.programme?.code)),
    departmentCodes: uniqueCodes(subjects.map((subject) => subject.scheme.programme?.department.code)),
  }
}

function hasReportScope(scope: LearningOpsReportScope): boolean {
  return scope.all || scope.subjectCodes.length > 0 || scope.programmeCodes.length > 0 || scope.departmentCodes.length > 0
}

function overlaps(values: readonly string[], allowed: readonly string[]): boolean {
  if (values.length === 0 || allowed.length === 0) return false
  const allowedSet = new Set(allowed)
  return values.some((value) => allowedSet.has(value))
}

function uniqueCodes(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(normalizeCodes(values))).sort((a, b) => a.localeCompare(b))
}

function normalizeCodes(values: readonly (string | null | undefined)[]): string[] {
  return values
    .map((value) => String(value ?? '').trim().toUpperCase())
    .filter(Boolean)
}
