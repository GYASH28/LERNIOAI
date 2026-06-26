import 'server-only'

import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import type { AuthorityContext } from '@/lib/authority'
import {
  resolveAcademicSubjectScope,
  scopedContributionWhereForSubjects,
  scopedLessonWhereForSubjects,
  scopedResourceWhereForSubjects,
} from '@/lib/authority/workspace-data'
import type { Role } from '@/lib/roles'

export interface WorkspaceModule {
  title: string
  description: string
  scopeNote: string
  rows: Array<{
    label: string
    detail: string
    meta: string
  }>
}

const moduleConfig: Partial<Record<Role, Record<string, readonly [string, string]>>> = {
  admin: {
    access: ['Scoped access', 'Review staff, CR, and capability assignments with real academic scope.'],
    curriculum: ['CWIT catalogue health', 'Inspect departments, programmes, subjects, classes, and content coverage.'],
    audit: ['Audit trail', 'Read immutable authority and security events.'],
  },
  coordinator: {
    assignments: ['Faculty coverage', 'Coordinate teachers, subjects, and class responsibility.'],
    reviews: ['Department review queue', 'Track provisional mappings and content that need academic verification.'],
    analytics: ['Department analytics', 'Read syllabus pace, resource coverage, and learning health.'],
  },
  teacher: {
    content: ['Lesson planner', 'Draft and manage topic objectives, resources, practical work, and homework.'],
    questions: ['Question builder', 'Create and refine question banks inside subject scope.'],
    analytics: ['Class insights', 'Understand subject, engagement, and class learning progress.'],
  },
  reviewer: {
    queue: ['Review capability queue', 'Compare revisions and record academic decisions.'],
    citations: ['Citation checks', 'Inspect grounding and source quality.'],
    policy: ['Publishing policy', 'Follow safe content state transitions.'],
  },
  moderator: {
    reports: ['Content safety reports', 'Resolve reports and content safety issues.'],
    uploads: ['Upload safety review', 'Detect unsafe, duplicate, or malformed materials.'],
    audit: ['Safety audit', 'Trace content safety actions.'],
  },
  cr: {
    resources: ['Class resources', 'Curate helpful material for assigned classmates.'],
    feedback: ['Class feedback', 'Collect non-sensitive learning blockers.'],
    reports: ['Content reports', 'Flag missing or incorrect learning material.'],
  },
}

export async function getWorkspaceModule(role: Role, module: string, authority: AuthorityContext): Promise<WorkspaceModule> {
  const roleConfig = moduleConfig[role]
  const entry = roleConfig?.[module]
  if (!entry) notFound()

  const [title, description] = entry
  const rows = await loadRows(role, module, authority)

  return {
    title,
    description,
    scopeNote: scopeNote(authority),
    rows,
  }
}

async function loadRows(role: Role, module: string, authority: AuthorityContext): Promise<WorkspaceModule['rows']> {
  if (role === 'admin' && module === 'access') {
    const requests = await db.roleRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        requestedRole: true,
        departmentCode: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    })
    if (requests.length === 0) return emptyRows('No pending role requests.')
    return requests.map((request) => ({
      label: `${request.user.name} requested ${request.requestedRole}`,
      detail: request.user.email,
      meta: request.departmentCode ?? request.createdAt.toISOString().slice(0, 10),
    }))
  }

  if (role === 'admin' && module === 'audit') {
    const events = await db.auditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { action: true, entityType: true, summary: true, createdAt: true },
    })
    if (events.length === 0) return emptyRows('No audit events recorded yet.')
    return events.map((event) => ({
      label: event.action,
      detail: event.summary ?? event.entityType,
      meta: event.createdAt.toISOString().slice(0, 16).replace('T', ' '),
    }))
  }

  if (role === 'admin' && module === 'curriculum') {
    const [departments, programmes, subjects, lessons, classes] = await Promise.all([
      db.department.count(),
      db.programme.count(),
      db.subject.count(),
      db.lesson.count(),
      db.classGroup.count(),
    ])
    return [
      { label: 'Departments', detail: `${departments} configured`, meta: 'Hierarchy' },
      { label: 'Programmes', detail: `${programmes} configured`, meta: 'Hierarchy' },
      { label: 'Subjects', detail: `${subjects} configured`, meta: 'Curriculum' },
      { label: 'Lessons', detail: `${lessons} available`, meta: 'Content' },
      { label: 'Classes', detail: `${classes} normalized`, meta: 'Authority' },
    ]
  }

  if (role === 'teacher') {
    const subjectIds = [...authority.scopeIndex.subjectIds]
    if (subjectIds.length === 0) return emptyRows('No active subject assignments.')
    const subjects = await db.subject.findMany({
      where: { id: { in: subjectIds } },
      orderBy: { code: 'asc' },
      take: 10,
      select: { code: true, name: true, shortName: true },
    })
    return subjects.map((subject) => ({
      label: `${subject.code} ${subject.shortName ?? ''}`.trim(),
      detail: subject.name,
      meta: 'Assigned subject',
    }))
  }

  if (role === 'coordinator') {
    const departments = authority.scopeIndex.departmentCodes
    if (departments.length === 0) return emptyRows('No active department assignments.')
    return departments.map((department) => ({
      label: department,
      detail: 'Department scope is active for this workspace.',
      meta: 'Scoped',
    }))
  }

  if (role === 'reviewer') {
    const subjectIds = await resolveAcademicSubjectScope(authority)
    const underReview = await db.lesson.count({
      where: { ...scopedLessonWhereForSubjects(subjectIds), status: 'under_review' },
    })
    return [{ label: 'Lessons under review', detail: `${underReview} waiting for action`, meta: 'Queue' }]
  }

  if (role === 'moderator') {
    const subjectIds = await resolveAcademicSubjectScope(authority, { includeInstitutionScope: true })
    const [reported, heldResources] = await Promise.all([
      db.contribution.count({ where: { ...scopedContributionWhereForSubjects(subjectIds), reports: { gt: 0 } } }),
      db.resource.count({ where: { ...scopedResourceWhereForSubjects(subjectIds), visibility: 'private' } }),
    ])
    return [
      { label: 'Reported contributions', detail: `${reported} items need triage`, meta: 'Safety' },
      { label: 'Held resources', detail: `${heldResources} resources are currently private`, meta: 'Visibility' },
    ]
  }

  if (role === 'cr') {
    const classGroups = authority.scopeIndex.classGroupIds.length
    return [
      {
        label: 'Class scope',
        detail: classGroups ? `${classGroups} assigned class group${classGroups === 1 ? '' : 's'}` : 'No class group assigned',
        meta: 'Privacy-safe',
      },
    ]
  }

  return emptyRows('No records available.')
}

function scopeNote(authority: AuthorityContext) {
  const parts = [
    authority.scopeIndex.departmentCodes.length
      ? `${authority.scopeIndex.departmentCodes.length} department code scope`
      : null,
    authority.scopeIndex.subjectIds.length ? `${authority.scopeIndex.subjectIds.length} subject scope` : null,
    authority.scopeIndex.classGroupIds.length ? `${authority.scopeIndex.classGroupIds.length} class scope` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' / ') : 'No elevated scope is active for this module.'
}

function emptyRows(message: string): WorkspaceModule['rows'] {
  return [{ label: 'Nothing pending', detail: message, meta: 'Clear' }]
}
