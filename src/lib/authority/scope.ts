import { normalizePermission, normalizeRole, permissionsForRole, type Permission, type PermissionInput, type Role } from '@/lib/roles'

export interface AuthorityScope {
  institutionId?: string | null
  departmentId?: string | null
  departmentCode?: string | null
  programmeId?: string | null
  schemeId?: string | null
  semesterId?: string | null
  classGroupId?: string | null
  classGroupKey?: string | null
  subjectId?: string | null
  subjectIds?: readonly string[] | null
  resourceOwnerUserId?: string | null
  ownOnly?: boolean | null
}

export interface ScopedAuthorityAssignment {
  role: Role
  source:
    | 'primary-role'
    | 'role-assignment'
    | 'teaching-assignment'
    | 'class-membership'
    | 'legacy-user-field'
    | 'institution-membership'
  institutionId?: string | null
  departmentId?: string | null
  departmentCode?: string | null
  programmeId?: string | null
  schemeId?: string | null
  semesterId?: string | null
  classGroupId?: string | null
  classGroupKey?: string | null
  subjectId?: string | null
  status: 'active' | 'verified'
}

export interface AuthorityContext {
  user: {
    id: string
    email: string
    name: string
    role: Role
    status?: string | null
    profileComplete?: boolean | null
  }
  primaryRole: Role
  activeRoles: readonly Role[]
  capabilities: readonly Permission[]
  assignments: readonly ScopedAuthorityAssignment[]
  scopeIndex: {
    institutionIds: readonly string[]
    departmentIds: readonly string[]
    departmentCodes: readonly string[]
    programmeIds: readonly string[]
    schemeIds: readonly string[]
    semesterIds: readonly string[]
    classGroupIds: readonly string[]
    classGroupKeys: readonly string[]
    subjectIds: readonly string[]
  }
  authorityVersion: number
}

const SUBJECT_SCOPED_PERMISSIONS = new Set<Permission>([
  'lessons.create',
  'lessons.update',
  'lessons.submit_review',
  'lessons.review',
  'lessons.verify',
  'lessons.publish',
  'lessons.archive',
  'questions.create',
  'questions.update',
  'questions.review',
  'questions.publish',
  'questions.archive',
  'questions.bulk_import',
  'questions.bulk_export',
  'question_papers.create',
  'question_papers.update',
  'question_papers.review',
  'question_papers.publish',
  'question_papers.archive',
  'assessments.assign',
  'assessments.results.read',
  'assessments.results.export',
  'resources.create',
  'resources.update',
  'resources.review',
  'resources.publish',
  'resources.archive',
  'analytics.subject.read',
  'ai.content_draft',
  'ai.question_generate',
  'ai.content_review',
])

const DEPARTMENT_SCOPED_PERMISSIONS = new Set<Permission>([
  'users.read',
  'users.update',
  'roles.assign',
  'roles.revoke',
  'roles.approve_request',
  'roles.reject_request',
  'invites.read',
  'invites.create',
  'invites.revoke',
  'invites.resend',
  'departments.manage',
  'programmes.manage',
  'schemes.manage',
  'semesters.manage',
  'class_groups.manage',
  'class_memberships.manage',
  'teaching_assignments.manage',
  'subjects.create',
  'subjects.update',
  'subjects.archive',
  'units.create',
  'units.update',
  'units.reorder',
  'units.archive',
  'topics.create',
  'topics.update',
  'topics.reorder',
  'topics.archive',
  'analytics.department.read',
  'analytics.export',
  'audit.read',
])

const CLASS_SCOPED_PERMISSIONS = new Set<Permission>([
  'class.resources.curate',
  'class.updates.create',
  'class.feedback.read',
  'class.feedback.manage',
  'attendance.mark',
  'analytics.class.read',
])

const SELF_SCOPED_PERMISSIONS = new Set<Permission>([
  'roles.request',
  'contributions.create',
  'contributions.read',
  'reports.create',
  'analytics.self.read',
  'ai.tutor.use',
])

export function parseAssignedSubjectIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueNonEmptyStrings(value)
  }

  if (typeof value !== 'string') return []
  const trimmed = value.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? uniqueNonEmptyStrings(parsed) : []
  } catch {
    return []
  }
}

export function buildClassGroupKey(input: {
  departmentCode?: string | null
  semesterNumber?: number | string | null
  division?: string | null
}) {
  const departmentCode = clean(input.departmentCode)?.toUpperCase()
  const semester = clean(input.semesterNumber)
  const division = clean(input.division)?.toUpperCase()
  return departmentCode && semester && division ? `${departmentCode}:S${semester}:${division}` : null
}

export function canUseCapability(
  authority: AuthorityContext,
  permission: PermissionInput,
  requestedScope?: AuthorityScope,
): boolean {
  const normalized = normalizePermission(permission)
  if (!normalized) return false

  const activeRoles = authority.activeRoles.map(normalizeRole)
  if (authority.user.status === 'disabled') return false
  if (!authority.capabilities.includes(normalized)) return false
  if (activeRoles.includes('admin')) return true

  const scope = normalizeRequestedScope(requestedScope)
  if (SELF_SCOPED_PERMISSIONS.has(normalized)) {
    if (!scope || scope.ownOnly) return true
    if (scope.resourceOwnerUserId && scope.resourceOwnerUserId === authority.user.id) return true
  }

  if (isPublicReadCapability(normalized)) return true

  if (!scope) return false

  if (scope.subjectIds.length > 0 || scope.subjectId) {
    const requestedSubjectIds = uniqueNonEmptyStrings([
      ...(scope.subjectId ? [scope.subjectId] : []),
      ...scope.subjectIds,
    ])
    if (
      requestedSubjectIds.length > 0 &&
      requestedSubjectIds.every((subjectId) => authority.scopeIndex.subjectIds.includes(subjectId)) &&
      SUBJECT_SCOPED_PERMISSIONS.has(normalized)
    ) {
      return true
    }
  }

  if (
    scope.departmentCode &&
    authority.scopeIndex.departmentCodes.includes(scope.departmentCode) &&
    DEPARTMENT_SCOPED_PERMISSIONS.has(normalized)
  ) {
    return true
  }

  if (
    scope.departmentId &&
    authority.scopeIndex.departmentIds.includes(scope.departmentId) &&
    DEPARTMENT_SCOPED_PERMISSIONS.has(normalized)
  ) {
    return true
  }

  if (
    scope.classGroupId &&
    authority.scopeIndex.classGroupIds.includes(scope.classGroupId) &&
    CLASS_SCOPED_PERMISSIONS.has(normalized)
  ) {
    return true
  }

  if (
    scope.classGroupKey &&
    authority.scopeIndex.classGroupKeys.includes(scope.classGroupKey) &&
    CLASS_SCOPED_PERMISSIONS.has(normalized)
  ) {
    return true
  }

  if (
    scope.institutionId &&
    authority.scopeIndex.institutionIds.includes(scope.institutionId) &&
    canUseInstitutionScopedCapability(activeRoles, normalized)
  ) {
    return true
  }

  return false
}

export function createAuthorityContext(input: {
  user: AuthorityContext['user']
  primaryRole?: Role
  activeRoles?: readonly Role[]
  capabilities?: readonly Permission[]
  assignments?: readonly ScopedAuthorityAssignment[]
  scopeIndex?: Partial<AuthorityContext['scopeIndex']>
  authorityVersion?: number
}): AuthorityContext {
  const primaryRole = input.primaryRole ?? normalizeRole(input.user.role)
  return {
    user: { ...input.user, role: primaryRole },
    primaryRole,
    activeRoles: input.activeRoles ?? [primaryRole],
    capabilities: input.capabilities ?? permissionsForRole(primaryRole),
    assignments: input.assignments ?? [],
    scopeIndex: {
      institutionIds: dedupe(input.scopeIndex?.institutionIds),
      departmentIds: dedupe(input.scopeIndex?.departmentIds),
      departmentCodes: dedupe(input.scopeIndex?.departmentCodes).map((code) => code.toUpperCase()),
      programmeIds: dedupe(input.scopeIndex?.programmeIds),
      schemeIds: dedupe(input.scopeIndex?.schemeIds),
      semesterIds: dedupe(input.scopeIndex?.semesterIds),
      classGroupIds: dedupe(input.scopeIndex?.classGroupIds),
      classGroupKeys: dedupe(input.scopeIndex?.classGroupKeys),
      subjectIds: dedupe(input.scopeIndex?.subjectIds),
    },
    authorityVersion: input.authorityVersion ?? 0,
  }
}

function normalizeRequestedScope(scope: AuthorityScope | undefined) {
  if (!scope) return null
  const normalized = {
    institutionId: clean(scope.institutionId),
    departmentId: clean(scope.departmentId),
    departmentCode: clean(scope.departmentCode)?.toUpperCase() ?? null,
    programmeId: clean(scope.programmeId),
    schemeId: clean(scope.schemeId),
    semesterId: clean(scope.semesterId),
    classGroupId: clean(scope.classGroupId),
    classGroupKey: clean(scope.classGroupKey),
    subjectId: clean(scope.subjectId),
    subjectIds: uniqueNonEmptyStrings(scope.subjectIds ?? []),
    resourceOwnerUserId: clean(scope.resourceOwnerUserId),
    ownOnly: Boolean(scope.ownOnly),
  }

  const hasAnyScope = Object.entries(normalized).some(([key, value]) => {
    if (key === 'ownOnly') return value === true
    if (Array.isArray(value)) return value.length > 0
    return Boolean(value)
  })
  return hasAnyScope ? normalized : null
}

function isPublicReadCapability(permission: Permission) {
  return [
    'subjects.read',
    'units.read',
    'topics.read',
    'lessons.read',
    'questions.read',
    'question_papers.read',
    'resources.read',
    'departments.read',
    'programmes.read',
    'schemes.read',
    'semesters.read',
  ].includes(permission)
}

function canUseInstitutionScopedCapability(activeRoles: readonly Role[], permission: Permission) {
  if (activeRoles.includes('moderator')) {
    return [
      'reports.read',
      'reports.resolve',
      'moderation.hold',
      'moderation.restore',
      'moderation.user_restrict',
      'audit.read',
    ].includes(permission)
  }
  return false
}

function clean(value: unknown): string | null {
  const text = String(value ?? '').trim()
  return text ? text : null
}

function uniqueNonEmptyStrings(values: readonly unknown[]): string[] {
  return dedupe(values.map(clean))
}

function dedupe(values: readonly (string | null | undefined)[] | undefined): string[] {
  return Array.from(new Set((values ?? []).filter((value): value is string => Boolean(value))))
}
