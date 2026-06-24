export const ROLES = ['student', 'cr', 'teacher', 'coordinator', 'moderator', 'reviewer', 'admin'] as const
export type Role = (typeof ROLES)[number]

export type Permission =
  | 'content.read'
  | 'content.submit'
  | 'content.review'
  | 'content.publish'
  | 'attendance.mark'
  | 'user.manage'
  | 'role.assign'
  | 'analytics.department.read'
  | 'analytics.institute.read'

export const ROLE_LABELS: Record<Role, string> = {
  student: 'Student',
  cr: 'Class Representative',
  teacher: 'Teacher',
  coordinator: 'Coordinator / HOD',
  moderator: 'Moderator',
  reviewer: 'Reviewer',
  admin: 'Admin',
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  student: ['content.read', 'content.submit'],
  cr: ['content.read', 'content.submit', 'attendance.mark'],
  teacher: ['content.read', 'content.submit', 'content.review', 'analytics.department.read'],
  coordinator: [
    'content.read',
    'content.submit',
    'content.review',
    'content.publish',
    'attendance.mark',
    'analytics.department.read',
  ],
  moderator: ['content.read', 'content.review'],
  reviewer: ['content.read', 'content.review', 'content.publish'],
  admin: [
    'content.read',
    'content.submit',
    'content.review',
    'content.publish',
    'attendance.mark',
    'user.manage',
    'role.assign',
    'analytics.department.read',
    'analytics.institute.read',
  ],
}

export function normalizeRole(role: unknown): Role {
  const normalized = String(role || 'student').trim().toLowerCase()
  return ROLES.includes(normalized as Role) ? (normalized as Role) : 'student'
}

export function isElevatedRole(role: unknown): boolean {
  return normalizeRole(role) !== 'student'
}

export function hasPermission(role: unknown, permission: Permission): boolean {
  return ROLE_PERMISSIONS[normalizeRole(role)].includes(permission)
}

export function canAssignRole(assignerRole: unknown, targetRole: unknown): boolean {
  const assigner = normalizeRole(assignerRole)
  const target = normalizeRole(targetRole)
  if (target === 'admin') return false
  if (assigner === 'admin') return true
  if (assigner === 'coordinator') return ['student', 'cr', 'teacher', 'moderator'].includes(target)
  return false
}
