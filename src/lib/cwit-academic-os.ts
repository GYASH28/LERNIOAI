import { CWIT_DEPARTMENTS } from '@/lib/cwit-departments'

export const CWIT_BRANCH_MATRIX = CWIT_DEPARTMENTS
  .filter((department) => department.category === 'engineering')
  .map((department) => ({
    code: department.code,
    label: department.shortName,
    name: department.name,
    accentColor: department.accentColor,
  }))

export const CWIT_SEMESTERS = [1, 2, 3, 4, 5, 6] as const

export const ACADEMIC_OS_STATS = [
  { value: '6', label: 'diploma branches', detail: 'CWIT engineering catalogue' },
  { value: '36', label: 'semester views', detail: 'one reusable dashboard engine' },
  { value: '5', label: 'OS layers', detail: 'catalogue to intelligence' },
  { value: '6', label: 'core roles', detail: 'student, CR, teacher, HOD, admin, super admin' },
] as const

export const ACADEMIC_OS_LAYERS = [
  {
    key: 'A',
    title: 'Canonical catalogue',
    body: 'CWIT branches, schemes, semesters, subjects, topics, aliases and source confidence.',
  },
  {
    key: 'B',
    title: 'Academic operations',
    body: 'Cohorts, enrollments, timetable, teacher assignments, CR ownership and academic calendar.',
  },
  {
    key: 'C',
    title: 'Subject intelligence',
    body: 'Syllabus, videos, notes, practicals, PYQs, quizzes, resources and progress in one workspace.',
  },
  {
    key: 'D',
    title: 'Role workspaces',
    body: 'Admin, HOD, teacher, CR and student views show only the work that role needs.',
  },
  {
    key: 'E',
    title: 'Academic intelligence',
    body: 'Search, grounded LEO answers, weak-topic recovery, exam planning and resource recommendations.',
  },
] as const

export const CORE_ROLE_WORKSPACES = [
  {
    role: 'Academic Admin',
    work: 'Start academic year, import rosters, import timetable and resolve exceptions.',
  },
  {
    role: 'HOD / Coordinator',
    work: 'Review branch coverage, faculty mapping, provisional subjects and department health.',
  },
  {
    role: 'Teacher',
    work: 'See assigned subjects, prepare lessons, publish resources and read class insights.',
  },
  {
    role: 'CR',
    work: 'Manage class notices, collect issues, request resources and escalate blockers.',
  },
  {
    role: 'Student',
    work: 'Open today plan, continue subjects, practise weak topics and ask LEO with context.',
  },
] as const

export const CAPABILITY_REPLACEMENTS = [
  'review syllabus',
  'review resources',
  'review questions',
  'moderate content',
] as const
