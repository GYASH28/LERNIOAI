import 'server-only'

import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import type { AuthorityContext } from '@/lib/authority'
import type { Role } from '@/lib/roles'

export interface WorkspaceMetric {
  label: string
  value: string
  detail: string
}

export interface WorkspaceAction {
  label: string
  href: string
  detail: string
}

export interface WorkspaceOverview {
  role: Role
  title: string
  eyebrow: string
  description: string
  metrics: WorkspaceMetric[]
  actions: WorkspaceAction[]
  scopeNote: string
}

export async function getWorkspaceOverview(role: Role, authority: AuthorityContext): Promise<WorkspaceOverview> {
  switch (role) {
    case 'admin':
      return getAdminOverview()
    case 'coordinator':
      return getCoordinatorOverview(authority)
    case 'teacher':
      return getTeacherOverview(authority)
    case 'reviewer':
      return getReviewerOverview(authority)
    case 'moderator':
      return getModeratorOverview(authority)
    case 'cr':
      return getCrOverview(authority)
    default:
      return getStudentRoleOverview()
  }
}

async function getAdminOverview(): Promise<WorkspaceOverview> {
  const [
    users,
    activeUsers,
    pendingRoleRequests,
    departments,
    programmes,
    classGroups,
    openImportFindings,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: 'active' } }),
    db.roleRequest.count({ where: { status: 'pending' } }),
    db.department.count({ where: { status: 'active' } }),
    db.programme.count({ where: { status: 'active' } }),
    db.classGroup.count({ where: { status: 'active' } }),
    db.importFinding.count({ where: { resolutionStatus: 'open' } }),
  ])

  return {
    role: 'admin',
    title: 'Academic Admin Operations',
    eyebrow: 'CWIT launch control',
    description: 'Start from the seeded CWIT catalogue, import people and timetable data, then resolve only the exceptions before dashboards go live.',
    scopeNote: 'Admin access is campus-wide, audited, and focused on academic-year setup rather than raw database editing.',
    metrics: [
      { label: 'Active users', value: format(activeUsers), detail: `${format(users)} total accounts` },
      { label: 'CWIT departments', value: format(departments), detail: 'Seeded catalogue surface' },
      { label: 'Programmes', value: format(programmes), detail: 'Branch-aligned academic routes' },
      { label: 'Active cohorts', value: format(classGroups), detail: 'Class dashboards generated from scope' },
      { label: 'Open exceptions', value: format(openImportFindings + pendingRoleRequests), detail: 'Imports and access items needing review' },
    ],
    actions: [
      { label: 'Review scoped access', href: '/admin/access', detail: 'Approve staff and CR access with real academic scope.' },
      { label: 'Register CWIT sources', href: '/admin/syllabus/sources', detail: 'Add official PDFs, curriculum pages, and source evidence.' },
      { label: 'Run syllabus imports', href: '/admin/syllabus/imports', detail: 'Queue extraction jobs and resolve uncertain mappings.' },
      { label: 'Review resources', href: '/admin/resources/queue', detail: 'Approve, hold, or request changes on mapped resources.' },
    ],
  }
}

async function getCoordinatorOverview(authority: AuthorityContext): Promise<WorkspaceOverview> {
  const departmentScope = await resolveDepartmentScope(authority)
  const [departmentUsers, pendingRequests, subjects] = departmentScope.departmentCodes.length || departmentScope.departmentIds.length
    ? await Promise.all([
        db.user.count({ where: { departmentCode: { in: departmentScope.departmentCodes } } }),
        db.roleRequest.count({ where: { departmentCode: { in: departmentScope.departmentCodes }, status: 'pending' } }),
        db.subject.count({ where: subjectWhereForDepartmentScope(departmentScope) }),
      ])
    : [0, 0, 0]

  return {
    role: 'coordinator',
    title: 'HOD / Coordinator Workspace',
    eyebrow: departmentScope.departmentCodes.length
      ? `Department scope: ${departmentScope.departmentCodes.join(', ')}`
      : 'No department scope assigned',
    description: 'Monitor department coverage, faculty mapping, provisional subject data, resource quality, and semester health.',
    scopeNote: departmentScope.departmentCodes.length || departmentScope.departmentIds.length
      ? 'Only users, subjects, and requests inside your department scope are counted here.'
      : 'You have the coordinator role but no active department assignment yet.',
    metrics: [
      { label: 'Department users', value: format(departmentUsers), detail: 'Scoped by department code' },
      { label: 'Pending requests', value: format(pendingRequests), detail: 'Department role workflow' },
      { label: 'Subjects', value: format(subjects), detail: 'Department curriculum' },
    ],
    actions: [
      { label: 'Review assignments', href: '/coordinator/assignments', detail: 'Confirm teachers, subjects, and class responsibility.' },
      { label: 'Review department content', href: '/coordinator/reviews', detail: 'Approve provisional mappings and resource packs.' },
      { label: 'Open department analytics', href: '/coordinator/analytics', detail: 'Read syllabus pace, coverage, and weak-topic signals.' },
    ],
  }
}

async function getTeacherOverview(authority: AuthorityContext): Promise<WorkspaceOverview> {
  const subjectIds = [...authority.scopeIndex.subjectIds]
  const [subjects, lessons, questions, resources] = subjectIds.length
    ? await Promise.all([
        db.subject.count({ where: { id: { in: subjectIds } } }),
        db.lesson.count({
          where: {
            OR: [
              { unit: { subjectId: { in: subjectIds } } },
              { topic: { unit: { subjectId: { in: subjectIds } } } },
            ],
          },
        }),
        db.question.count({ where: { subjectId: { in: subjectIds } } }),
        db.resource.count({ where: { subjectId: { in: subjectIds } } }),
      ])
    : [0, 0, 0, 0]

  return {
    role: 'teacher',
    title: 'Teacher Workspace',
    eyebrow: subjectIds.length ? `${subjectIds.length} subject scope${subjectIds.length === 1 ? '' : 's'}` : 'No subject scope assigned',
    description: 'See today classes, assigned subjects, lesson planning, resource coverage, and class insight tasks for your scope.',
    scopeNote: subjectIds.length
      ? 'Teacher tools are locked to your active subject assignments.'
      : 'You have teacher access but no active subject assignment yet.',
    metrics: [
      { label: 'Assigned subjects', value: format(subjects), detail: 'Active scope' },
      { label: 'Lessons', value: format(lessons), detail: 'Editable when in scope' },
      { label: 'Questions', value: format(questions), detail: 'Bank items' },
      { label: 'Resources', value: format(resources), detail: 'Study material' },
    ],
    actions: [
      { label: 'Prepare lesson plan', href: '/teacher/content', detail: 'Draft topic objectives, resources, practical activity, and homework.' },
      { label: 'Build question set', href: '/teacher/questions', detail: 'Create and refine scoped practice and exam questions.' },
      { label: 'View class insights', href: '/teacher/analytics', detail: 'Understand engagement, weak topics, and subject progress.' },
    ],
  }
}

async function getReviewerOverview(authority: AuthorityContext): Promise<WorkspaceOverview> {
  const subjectIds = await resolveAcademicSubjectScope(authority)
  const scopedLessonWhere = scopedLessonWhereForSubjects(subjectIds)
  const scopedContributionWhere = scopedContributionWhereForSubjects(subjectIds)
  const [underReview, verified, submittedContributions] = await Promise.all([
    db.lesson.count({ where: { ...scopedLessonWhere, status: 'under_review' } }),
    db.lesson.count({ where: { ...scopedLessonWhere, status: 'verified' } }),
    db.contribution.count({
      where: { ...scopedContributionWhere, status: { in: ['submitted', 'under_review'] } },
    }),
  ])

  return {
    role: 'reviewer',
    title: 'Review Capability Queue',
    eyebrow:
      subjectIds === null
        ? 'Admin review scope'
        : subjectIds.length
          ? `${subjectIds.length} subject scope${subjectIds.length === 1 ? '' : 's'}`
          : 'Scope pending',
    description: 'A scoped capability queue for syllabus, resource, question, and citation review.',
    scopeNote: 'Review capability does not grant user management or general moderation authority.',
    metrics: [
      { label: 'Lessons waiting', value: format(underReview), detail: 'Under review' },
      { label: 'Verified lessons', value: format(verified), detail: 'Ready for publish policy' },
      { label: 'Contributions', value: format(submittedContributions), detail: 'Submitted or under review' },
    ],
    actions: [
      { label: 'Open review queue', href: '/reviewer/queue', detail: 'Compare revisions and request changes.' },
      { label: 'Inspect citations', href: '/reviewer/citations', detail: 'Check grounding and source quality.' },
      { label: 'Publish policy', href: '/reviewer/policy', detail: 'Follow safe content state transitions.' },
    ],
  }
}

async function getModeratorOverview(authority: AuthorityContext): Promise<WorkspaceOverview> {
  const subjectIds = await resolveAcademicSubjectScope(authority, { includeInstitutionScope: true })
  const scopedContributionWhere = scopedContributionWhereForSubjects(subjectIds)
  const scopedResourceWhere = scopedResourceWhereForSubjects(subjectIds)
  const [flaggedContributions, heldResources, rejectedContributions] = await Promise.all([
    db.contribution.count({ where: { ...scopedContributionWhere, reports: { gt: 0 } } }),
    db.resource.count({ where: { ...scopedResourceWhere, visibility: 'private' } }),
    db.contribution.count({ where: { ...scopedContributionWhere, status: 'rejected' } }),
  ])

  return {
    role: 'moderator',
    title: 'Content Safety Capability',
    eyebrow: authority.scopeIndex.institutionIds.length ? 'Institution safety scope' : 'Safety scope pending',
    description: 'A scoped safety capability for reports, unsafe resources, duplicates, malformed uploads, and policy violations.',
    scopeNote: 'Content safety can hold or restore content, but cannot publish academic truth unless review capability is also granted.',
    metrics: [
      { label: 'Flagged contributions', value: format(flaggedContributions), detail: 'Has reports' },
      { label: 'Held resources', value: format(heldResources), detail: 'Private visibility' },
      { label: 'Rejected items', value: format(rejectedContributions), detail: 'Closed moderation actions' },
    ],
    actions: [
      { label: 'Resolve reports', href: '/moderator/reports', detail: 'Hold, restore, or escalate safely.' },
      { label: 'Review uploads', href: '/moderator/uploads', detail: 'Detect duplicates and unsafe material.' },
      { label: 'Audit moderation', href: '/moderator/audit', detail: 'Trace safety decisions.' },
    ],
  }
}

async function getCrOverview(authority: AuthorityContext): Promise<WorkspaceOverview> {
  const classGroupIds = [...authority.scopeIndex.classGroupIds]
  const [classmates, resources] = classGroupIds.length
    ? await Promise.all([
        db.classMembership.count({ where: { classGroupId: { in: classGroupIds }, status: 'active' } }),
        db.contribution.count({ where: { userId: authority.user.id } }),
      ])
    : [0, 0]

  return {
    role: 'cr',
    title: 'Class Representative Hub',
    eyebrow: classGroupIds.length ? `${classGroupIds.length} class scope${classGroupIds.length === 1 ? '' : 's'}` : 'No class scope assigned',
    description: 'Support classmates with timetable notices, resource requests, feedback collection, and issue escalation.',
    scopeNote: 'CR access keeps all student pages and adds only privacy-safe class tools.',
    metrics: [
      { label: 'Classmates', value: format(classmates), detail: 'Active class members' },
      { label: 'Your contributions', value: format(resources), detail: 'Submitted resources' },
    ],
    actions: [
      { label: 'Curate class resources', href: '/cr/resources', detail: 'Collect helpful material for your class.' },
      { label: 'Submit feedback', href: '/cr/feedback', detail: 'Raise non-sensitive class learning blockers.' },
      { label: 'Report issue', href: '/cr/reports', detail: 'Flag incorrect or missing content.' },
    ],
  }
}

function getStudentRoleOverview(): WorkspaceOverview {
  return {
    role: 'student',
    title: 'Student Workspace',
    eyebrow: 'Learning access',
    description: 'Continue learning, practice, revision, exams, and LEO support from the main student app.',
    scopeNote: 'Students can request roles, contribute resources, and report content without elevated access.',
    metrics: [],
    actions: [
      { label: 'Open dashboard', href: '/dashboard', detail: 'Return to the learning workspace.' },
      { label: 'Ask LEO', href: '/tutor', detail: 'Get help with a concept or exam answer.' },
    ],
  }
}

function format(value: number) {
  return new Intl.NumberFormat('en-IN').format(value)
}

async function resolveDepartmentScope(authority: AuthorityContext) {
  const departmentIds = [...authority.scopeIndex.departmentIds]
  const departmentCodes = [...authority.scopeIndex.departmentCodes]
  if (departmentIds.length === 0) return { departmentIds, departmentCodes }

  const departments = await db.department.findMany({
    where: { id: { in: departmentIds } },
    select: { code: true },
  })

  return {
    departmentIds,
    departmentCodes: uniqueStrings([...departmentCodes, ...departments.map((department) => department.code)]),
  }
}

export async function resolveAcademicSubjectScope(
  authority: AuthorityContext,
  options: { includeInstitutionScope?: boolean } = {},
) {
  if (authority.activeRoles.includes('admin')) return null

  const directSubjectIds = [...authority.scopeIndex.subjectIds]
  const departmentScope = await resolveDepartmentScope(authority)
  const institutionIds = options.includeInstitutionScope ? [...authority.scopeIndex.institutionIds] : []
  const subjectWhere = subjectWhereForAuthorityScope(directSubjectIds, departmentScope, institutionIds)

  if (!subjectWhere) return []

  const subjects = await db.subject.findMany({
    where: subjectWhere,
    select: { id: true },
  })

  return uniqueStrings([...directSubjectIds, ...subjects.map((subject) => subject.id)])
}

function subjectWhereForAuthorityScope(
  subjectIds: readonly string[],
  departmentScope: { departmentIds: readonly string[]; departmentCodes: readonly string[] },
  institutionIds: readonly string[],
): Prisma.SubjectWhereInput | null {
  const clauses: Prisma.SubjectWhereInput[] = []
  if (subjectIds.length) clauses.push({ id: { in: [...subjectIds] } })
  if (departmentScope.departmentIds.length || departmentScope.departmentCodes.length) {
    clauses.push(subjectWhereForDepartmentScope(departmentScope))
  }
  if (institutionIds.length) clauses.push({ scheme: { institutionId: { in: [...institutionIds] } } })
  return clauses.length ? { OR: clauses } : null
}

function subjectWhereForDepartmentScope(scope: {
  departmentIds: readonly string[]
  departmentCodes: readonly string[]
}): Prisma.SubjectWhereInput {
  const clauses: Prisma.SubjectWhereInput[] = []
  if (scope.departmentIds.length) {
    clauses.push({ scheme: { programme: { departmentId: { in: [...scope.departmentIds] } } } })
  }
  if (scope.departmentCodes.length) {
    clauses.push({ scheme: { programme: { department: { code: { in: [...scope.departmentCodes] } } } } })
  }
  return clauses.length ? { OR: clauses } : { id: { in: [] } }
}

export function scopedLessonWhereForSubjects(subjectIds: readonly string[] | null): Prisma.LessonWhereInput {
  if (subjectIds === null) return {}
  if (subjectIds.length === 0) return { id: { in: [] } }
  return {
    OR: [
      { unit: { subjectId: { in: [...subjectIds] } } },
      { topic: { unit: { subjectId: { in: [...subjectIds] } } } },
    ],
  }
}

export function scopedContributionWhereForSubjects(subjectIds: readonly string[] | null): Prisma.ContributionWhereInput {
  if (subjectIds === null) return {}
  return subjectIds.length ? { subjectId: { in: [...subjectIds] } } : { id: { in: [] } }
}

export function scopedResourceWhereForSubjects(subjectIds: readonly string[] | null): Prisma.ResourceWhereInput {
  if (subjectIds === null) return {}
  return subjectIds.length ? { subjectId: { in: [...subjectIds] } } : { id: { in: [] } }
}

function uniqueStrings(values: readonly string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}
