import { CWIT_DEPARTMENTS } from '@/lib/cwit-departments'
import {
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  canAssignRole,
  isElevatedRole,
  normalizeRole,
  type Role,
} from '@/lib/roles'

export const CAMPUS_ROLES = ['student', 'cr', 'teacher', 'coordinator', 'moderator', 'reviewer', 'admin'] as const

export type CampusRole = Role

export const CAMPUS_ROLE_LABELS: Record<CampusRole, string> = {
  ...ROLE_LABELS,
}

export const CAMPUS_ROLE_DESCRIPTIONS: Record<CampusRole, string> = {
  student: 'Learns, practises, tracks progress, and accesses department study material.',
  cr: 'Supports a class with attendance, class updates, and student coordination.',
  teacher: 'Owns subjects, learning material, assignments, and student progress reviews.',
  coordinator: 'Oversees department activity, teachers, students, attendance, and reports.',
  moderator: 'Reviews student contributions and handles content safety queues.',
  reviewer: 'Reviews and publishes verified academic content.',
  admin: 'Manages users, departments, role invites, and institute-wide configuration.',
}

export const CAMPUS_SEMESTERS = ['1', '2', '3', '4', '5', '6'] as const
export const CAMPUS_DIVISIONS = ['A', 'B', 'C', 'NOT_SURE'] as const

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
  return normalizeRole(role)
}

export function getCampusRoleLabel(role: unknown): string {
  return CAMPUS_ROLE_LABELS[normalizeCampusRole(role)]
}

export function isElevatedCampusRole(role: unknown): boolean {
  return isElevatedRole(role)
}

export function canAssignCampusRole(assignerRole: unknown, targetRole: unknown): boolean {
  return canAssignRole(assignerRole, targetRole)
}

export function getCampusDashboardPath(role: unknown): string {
  const normalized = normalizeCampusRole(role)
  const paths: Record<CampusRole, string> = {
    student: '/dashboard',
    cr: '/cr',
    teacher: '/teacher',
    coordinator: '/coordinator',
    moderator: '/moderator',
    reviewer: '/reviewer',
    admin: '/admin',
  }
  return paths[normalized]
}

export function normalizeEmail(email: unknown): string {
  return String(email || '').trim().toLowerCase()
}

export function validateCampusEmail(email: unknown): boolean {
  const normalized = normalizeEmail(email)
  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

export function validateRollNumber(rollNumber: unknown): boolean {
  const value = String(rollNumber || '').trim()
  if (!value) return true
  const pattern = process.env.NEXT_PUBLIC_LERNIO_ROLL_NUMBER_PATTERN || '^[A-Za-z0-9/-]{1,32}$'
  return new RegExp(pattern).test(value)
}

export function getProgrammeByDepartmentCode(code: unknown) {
  const normalized = String(code || '').trim().toUpperCase()
  return CWIT_PROGRAMMES.find((programme) => programme.departmentCode === normalized) ?? null
}

export function inviteCodePrefix(role: unknown): string {
  const prefix: Record<CampusRole, string> = {
    student: 'USR',
    cr: 'CR',
    teacher: 'TEA',
    coordinator: 'HOD',
    moderator: 'MOD',
    reviewer: 'REV',
    admin: 'ADM',
  }
  return prefix[normalizeCampusRole(role)]
}

export function getCampusRolePermissions(role: unknown) {
  return ROLE_PERMISSIONS[normalizeCampusRole(role)]
}
