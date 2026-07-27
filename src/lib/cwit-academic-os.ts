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
  { value: '3', label: 'core roles', detail: 'student, CR, admin' },
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
    body: 'Admin, CR and student views show only the work that role needs.',
  },
  {
    key: 'E',
    title: 'Academic intelligence',
    body: 'Search, grounded LEO answers, weak-topic recovery, exam planning and resource recommendations.',
  },
] as const

export const CORE_ROLE_WORKSPACES = [
  {
    role: 'Admin',
    work: 'Manage users, create CR invite codes, oversee classes and take attendance.',
  },
  {
    role: 'CR (Class Representative)',
    work: 'Take attendance, post class announcements, manage classmates and escalate issues.',
  },
  {
    role: 'Student',
    work: 'Open today plan, continue subjects, practise weak topics, track attendance and ask LEO.',
  },
] as const

export const CAPABILITY_REPLACEMENTS = [
  'take attendance',
  'post announcements',
  'view classmates',
  'track progress',
] as const
