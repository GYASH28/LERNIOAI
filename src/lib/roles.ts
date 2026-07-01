export const ROLES = ['student', 'cr', 'teacher', 'coordinator', 'moderator', 'reviewer', 'admin'] as const
export type Role = (typeof ROLES)[number]

export const PERMISSIONS = [
  'system.dashboard.read',
  'system.health.read',
  'system.settings.read',
  'system.settings.update',
  'system.feature_flags.manage',
  'system.integrations.read',
  'system.integrations.manage',
  'system.data.export',
  'system.data.import',
  'system.backup.manage',
  'users.read',
  'users.create',
  'users.update',
  'users.disable',
  'users.restore',
  'users.delete',
  'users.bulk_manage',
  'roles.read',
  'roles.request',
  'roles.assign',
  'roles.revoke',
  'roles.approve_request',
  'roles.reject_request',
  'invites.read',
  'invites.create',
  'invites.revoke',
  'invites.resend',
  'sessions.revoke',
  'institutions.read',
  'institutions.manage',
  'departments.read',
  'departments.manage',
  'programmes.read',
  'programmes.manage',
  'schemes.read',
  'schemes.manage',
  'semesters.read',
  'semesters.manage',
  'class_groups.read',
  'class_groups.manage',
  'class_memberships.manage',
  'teaching_assignments.manage',
  'subjects.read',
  'subjects.create',
  'subjects.update',
  'subjects.archive',
  'units.read',
  'units.create',
  'units.update',
  'units.reorder',
  'units.archive',
  'topics.read',
  'topics.create',
  'topics.update',
  'topics.reorder',
  'topics.archive',
  'lessons.read',
  'lessons.create',
  'lessons.update',
  'lessons.submit_review',
  'lessons.review',
  'lessons.verify',
  'lessons.publish',
  'lessons.archive',
  'content.restore',
  'content.version.read',
  'content.version.restore',
  'questions.read',
  'questions.create',
  'questions.update',
  'questions.review',
  'questions.publish',
  'questions.archive',
  'questions.bulk_import',
  'questions.bulk_export',
  'question_papers.read',
  'question_papers.create',
  'question_papers.update',
  'question_papers.review',
  'question_papers.publish',
  'question_papers.archive',
  'assessments.assign',
  'assessments.results.read',
  'assessments.results.export',
  'resources.read',
  'resources.create',
  'resources.update',
  'resources.review',
  'resources.publish',
  'resources.archive',
  'contributions.create',
  'contributions.read',
  'contributions.review',
  'contributions.approve',
  'contributions.reject',
  'contributions.restore',
  'analytics.self.read',
  'analytics.class.read',
  'analytics.subject.read',
  'analytics.department.read',
  'analytics.institution.read',
  'analytics.export',
  'analytics.student_identifiable.read',
  'ai.tutor.use',
  'ai.content_draft',
  'ai.question_generate',
  'ai.content_review',
  'ai.provider_usage.read',
  'ai.provider_config.manage',
  'ai.prompt_templates.manage',
  'reports.create',
  'reports.read',
  'reports.resolve',
  'moderation.hold',
  'moderation.restore',
  'moderation.user_restrict',
  'audit.read',
  'audit.export',
  'security.events.read',
  'class.resources.curate',
  'class.updates.create',
  'class.feedback.read',
  'class.feedback.manage',
  'attendance.mark',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export type LegacyPermission =
  | 'content.read'
  | 'content.submit'
  | 'content.review'
  | 'content.publish'
  | 'user.manage'
  | 'role.assign'
  | 'analytics.institute.read'

export type PermissionInput = Permission | LegacyPermission

const PERMISSION_SET = new Set<string>(PERMISSIONS)

const LEGACY_PERMISSION_ALIASES: Record<LegacyPermission, Permission> = {
  'content.read': 'lessons.read',
  'content.submit': 'contributions.create',
  'content.review': 'contributions.review',
  'content.publish': 'lessons.publish',
  'user.manage': 'users.update',
  'role.assign': 'roles.assign',
  'analytics.institute.read': 'analytics.institution.read',
}

const STUDENT_PERMISSIONS = [
  'subjects.read',
  'units.read',
  'topics.read',
  'lessons.read',
  'questions.read',
  'question_papers.read',
  'resources.read',
  'contributions.create',
  'contributions.read',
  'reports.create',
  'roles.request',
  'analytics.self.read',
  'ai.tutor.use',
] as const satisfies readonly Permission[]

const CR_PERMISSIONS = [
  ...STUDENT_PERMISSIONS,
  'class.resources.curate',
  'class.updates.create',
  'class.feedback.read',
  'class.feedback.manage',
] as const satisfies readonly Permission[]

const TEACHER_PERMISSIONS = [
  ...STUDENT_PERMISSIONS,
  'lessons.create',
  'lessons.update',
  'lessons.submit_review',
  'questions.create',
  'questions.update',
  'question_papers.create',
  'question_papers.update',
  'assessments.assign',
  'assessments.results.read',
  'resources.create',
  'resources.update',
  'analytics.class.read',
  'analytics.subject.read',
  'ai.content_draft',
  'ai.question_generate',
] as const satisfies readonly Permission[]

const COORDINATOR_PERMISSIONS = [
  ...TEACHER_PERMISSIONS,
  'system.dashboard.read',
  'users.read',
  'users.update',
  'roles.read',
  'roles.assign',
  'roles.revoke',
  'roles.approve_request',
  'roles.reject_request',
  'invites.read',
  'invites.create',
  'invites.revoke',
  'departments.read',
  'programmes.read',
  'schemes.read',
  'semesters.read',
  'class_groups.read',
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
  'lessons.review',
  'lessons.verify',
  'lessons.publish',
  'lessons.archive',
  'questions.review',
  'questions.publish',
  'questions.archive',
  'questions.bulk_import',
  'questions.bulk_export',
  'question_papers.review',
  'question_papers.publish',
  'question_papers.archive',
  'resources.review',
  'resources.publish',
  'resources.archive',
  'contributions.review',
  'contributions.approve',
  'contributions.reject',
  'analytics.department.read',
  'analytics.export',
  'ai.content_review',
  'audit.read',
] as const satisfies readonly Permission[]

const REVIEWER_PERMISSIONS = [
  ...STUDENT_PERMISSIONS,
  'lessons.review',
  'lessons.verify',
  'lessons.publish',
  'questions.review',
  'questions.publish',
  'question_papers.review',
  'question_papers.publish',
  'resources.review',
  'resources.publish',
  'contributions.review',
  'contributions.approve',
  'contributions.reject',
  'analytics.subject.read',
  'ai.content_review',
  'audit.read',
] as const satisfies readonly Permission[]

const MODERATOR_PERMISSIONS = [
  ...STUDENT_PERMISSIONS,
  'reports.read',
  'reports.resolve',
  'moderation.hold',
  'moderation.restore',
  'moderation.user_restrict',
  'resources.review',
  'resources.archive',
  'contributions.review',
  'contributions.reject',
  'audit.read',
] as const satisfies readonly Permission[]

export const ROLE_LABELS: Record<Role, string> = {
  student: 'Student',
  cr: 'Class Representative',
  teacher: 'Teacher',
  coordinator: 'Coordinator / HOD',
  moderator: 'Moderator',
  reviewer: 'Reviewer',
  admin: 'Admin',
}

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  student: STUDENT_PERMISSIONS,
  cr: CR_PERMISSIONS,
  teacher: TEACHER_PERMISSIONS,
  coordinator: COORDINATOR_PERMISSIONS,
  moderator: MODERATOR_PERMISSIONS,
  reviewer: REVIEWER_PERMISSIONS,
  admin: PERMISSIONS,
}

export function normalizeRole(role: unknown): Role {
  const normalized = String(role || 'student').trim().toLowerCase()
  return ROLES.includes(normalized as Role) ? (normalized as Role) : 'student'
}

export function normalizePermission(permission: unknown): Permission | null {
  const normalized = String(permission || '').trim() as PermissionInput
  if (PERMISSION_SET.has(normalized)) return normalized as Permission
  return LEGACY_PERMISSION_ALIASES[normalized as LegacyPermission] ?? null
}

export function isElevatedRole(role: unknown): boolean {
  return normalizeRole(role) !== 'student'
}

export function hasPermission(role: unknown, permission: PermissionInput): boolean {
  const normalized = normalizePermission(permission)
  return Boolean(normalized && ROLE_PERMISSIONS[normalizeRole(role)].includes(normalized))
}

export function permissionsForRole(role: unknown): readonly Permission[] {
  return ROLE_PERMISSIONS[normalizeRole(role)]
}

export function canAssignRole(assignerRole: unknown, targetRole: unknown): boolean {
  const assigner = normalizeRole(assignerRole)
  const target = normalizeRole(targetRole)
  if (target === 'admin') return false
  if (assigner === 'admin') return true
  if (assigner === 'coordinator') return ['student', 'cr', 'teacher', 'moderator'].includes(target)
  return false
}
