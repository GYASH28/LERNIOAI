import { normalizeRole, type Role } from '@/lib/roles'

export function validateAuthorityGrantDraft(input: {
  role: Role | string
  institutionId?: string | null
  departmentId?: string | null
  departmentCode?: string | null
  classGroupId?: string | null
  subjectId?: string | null
  subjectIds?: readonly string[] | null
}) {
  const role = normalizeRole(input.role)
  const subjectIds = uniqueIds([input.subjectId, ...(input.subjectIds ?? [])])
  const hasDepartment = Boolean(clean(input.departmentId) || clean(input.departmentCode))
  const hasInstitution = Boolean(clean(input.institutionId))
  const hasClass = Boolean(clean(input.classGroupId))

  switch (role) {
    case 'cr':
      return hasClass ? null : 'Class Representative grants require a class group.'
    case 'teacher':
      return subjectIds.length > 0 ? null : 'Teacher grants require at least one subject.'
    case 'coordinator':
      return hasDepartment ? null : 'Coordinator grants require a department.'
    case 'reviewer':
      return subjectIds.length > 0 || hasDepartment ? null : 'Reviewer grants require a subject or department.'
    case 'moderator':
      return hasInstitution || hasDepartment ? null : 'Moderator grants require an institution or department.'
    default:
      return 'This role cannot be granted from the authority console.'
  }
}

function clean(value: unknown) {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : null
}

function uniqueIds(values: readonly unknown[]) {
  return Array.from(new Set(values.map(clean).filter((value): value is string => Boolean(value))))
}
