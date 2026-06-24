import { CWIT_DEPARTMENTS } from '@/lib/cwit-departments'

export const CAMPUS_ROLES = ['student', 'cr', 'teacher', 'coordinator', 'admin'] as const

export type CampusRole = (typeof CAMPUS_ROLES)[number]

export const CAMPUS_ROLE_LABELS: Record<CampusRole, string> = {
  student: 'Student',
  cr: 'Class Representative',
  teacher: 'Teacher',
  coordinator: 'Coordinator / HOD',
  admin: 'Admin',
}

export const CAMPUS_ROLE_LEVELS: Record<CampusRole, number> = {
  student: 1,
  cr: 2,
  teacher: 3,
  coordinator: 4,
  admin: 5,
}

export const CAMPUS_ROLE_DESCRIPTIONS: Record<CampusRole, string> = {
  student: 'Learns, practises, tracks progress, and accesses department study material.',
  cr: 'Supports a class with attendance, class updates, and student coordination.',
  teacher: 'Owns subjects, learning material, assignments, and student progress reviews.',
  coordinator: 'Oversees department activity, teachers, students, attendance, and reports.',
  admin: 'Manages users, departments, role invites, and institute-wide configuration.',
}

export const CAMPUS_SEMESTERS = ['1', '2', '3', '4', '5', '6'] as const
export const CAMPUS_DIVISIONS = ['A', 'B', 'C'] as const

export const CWIT_PROGRAMMES = CWIT_DEPARTMENTS
  .filter((department) => department.programme)
  .map((department) => ({
    departmentCode: department.code,
    departmentName: department.name,
    programmeCode: department.programme?.code ?? department.code,
    programmeName: department.programme?.name ?? department.name,
    intake: department.programme?.intake,
    intakeNote: department.programme?.intakeNote,
    category: department.category,
  }))

export const DEFAULT_CAMPUS_PROFILE = {
  role: 'student' satisfies CampusRole,
  departmentCode: 'CIOT',
  departmentName: 'Computer Engineering & IoT',
  branch: 'Diploma in Computer Engineering & IoT',
  semesterNumber: 2,
  division: 'A',
  status: 'active',
}

export const CAMPUS_MODULE_AREAS = [
  {
    label: 'Academic workspace',
    title: 'Everything students need daily',
    text: 'Dashboard, timetable context, notes, practice, revision, exams, progress, materials, and profile tools.',
  },
  {
    label: 'Smart learning',
    title: 'AI-supported preparation',
    text: 'Tutor sessions, quizzes, study planner, flashcards, coding practice, labs, and readiness analytics.',
  },
  {
    label: 'Campus operations',
    title: 'Role-based workflows',
    text: 'Student, CR, teacher, coordinator, and admin profiles tied to CWIT departments and programmes.',
  },
] as const

export const CAMPUS_WORKFLOW = [
  ['Login', 'Secure credentials or approved Google login routes the user into Lernio.'],
  ['Complete profile', 'Student details include department, programme, semester, division, and roll number.'],
  ['Use the right workspace', 'Role hierarchy decides what a student, CR, teacher, coordinator, or admin can access.'],
] as const

export function normalizeCampusRole(role: unknown): CampusRole {
  const normalized = String(role || 'student').trim().toLowerCase()
  return CAMPUS_ROLES.includes(normalized as CampusRole) ? (normalized as CampusRole) : 'student'
}

export function getCampusRoleLabel(role: unknown): string {
  return CAMPUS_ROLE_LABELS[normalizeCampusRole(role)]
}

export function isElevatedCampusRole(role: unknown): boolean {
  return ['cr', 'teacher', 'coordinator', 'admin'].includes(normalizeCampusRole(role))
}

export function canAssignCampusRole(assignerRole: unknown, targetRole: unknown): boolean {
  const assigner = normalizeCampusRole(assignerRole)
  const target = normalizeCampusRole(targetRole)

  if (assigner === 'admin') {
    return target !== 'admin'
  }

  if (assigner === 'coordinator') {
    return ['student', 'cr', 'teacher'].includes(target)
  }

  return false
}

export function getCampusDashboardPath(_role: unknown): string {
  return '/dashboard'
}

export function normalizeEmail(email: unknown): string {
  return String(email || '').trim().toLowerCase()
}

export function validateCampusEmail(email: unknown): boolean {
  const normalized = normalizeEmail(email)
  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

export function validateRollNumber(rollNumber: unknown): boolean {
  return /^[0-9]{6}$/.test(String(rollNumber || '').trim())
}

export function getProgrammeByDepartmentCode(code: unknown) {
  const normalized = String(code || '').trim().toUpperCase()
  return CWIT_PROGRAMMES.find((programme) => programme.departmentCode === normalized) ?? CWIT_PROGRAMMES[0]
}

export function inviteCodePrefix(role: unknown): string {
  const prefix: Record<CampusRole, string> = {
    student: 'USR',
    cr: 'CR',
    teacher: 'TEA',
    coordinator: 'HOD',
    admin: 'ADM',
  }
  return prefix[normalizeCampusRole(role)]
}
