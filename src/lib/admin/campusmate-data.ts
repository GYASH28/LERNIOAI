import 'server-only'

import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { CAMPUSMATE_ADMIN_ITEMS } from '@/lib/admin/campusmate-navigation'

export type AdminMetric = {
  label: string
  value: string
  detail: string
  tone?: 'default' | 'good' | 'warning' | 'danger'
}

export type AdminRow = {
  id: string
  title: string
  subtitle: string
  status: string
  meta: string
}

export type AdminModuleData = {
  key: string
  title: string
  description: string
  metrics: AdminMetric[]
  rows: AdminRow[]
  emptyMessage: string
}

const nf = new Intl.NumberFormat('en-IN')
const format = (value: number) => nf.format(value)
const date = (value: Date | null | undefined) => value ? value.toLocaleDateString('en-IN') : '—'
const text = (value: string | null | undefined, fallback = '—') => value?.trim() || fallback

function moduleMeta(key: string) {
  const item = CAMPUSMATE_ADMIN_ITEMS.find((entry) => entry.href === `/admin/${key}`)
  if (!item) notFound()
  return item
}

export async function getAdminModuleData(key: string): Promise<AdminModuleData> {
  const item = moduleMeta(key)
  const base = { key, title: item.label, description: item.description }

  if (key === 'analytics') {
    const [users, activeUsers, subjects, lessons, questions, attempts, completedLessons] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { status: 'active' } }),
      db.subject.count({ where: { status: 'active' } }),
      db.lesson.count({ where: { status: 'published' } }),
      db.question.count(),
      db.questionAttempt.count(),
      db.lessonCompletion.count(),
    ])
    const subjectsRows = await db.subject.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, code: true, name: true, status: true, reviewStatus: true, semester: { select: { name: true } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Registered users', value: format(users), detail: `${format(activeUsers)} active`, tone: 'good' },
        { label: 'Active subjects', value: format(subjects), detail: 'Across published schemes' },
        { label: 'Published lessons', value: format(lessons), detail: `${format(completedLessons)} completions` },
        { label: 'Question activity', value: format(attempts), detail: `${format(questions)} bank questions` },
      ],
      rows: subjectsRows.map((subject) => ({
        id: subject.id,
        title: `${subject.code} · ${subject.name}`,
        subtitle: subject.semester.name,
        status: subject.reviewStatus,
        meta: subject.status,
      })),
      emptyMessage: 'No subject coverage data is available yet.',
    }
  }

  if (key === 'authority-assignments') {
    const [active, suspended, expired] = await Promise.all([
      db.roleAssignment.count({ where: { status: 'active', revokedAt: null } }),
      db.roleAssignment.count({ where: { status: 'suspended' } }),
      db.roleAssignment.count({ where: { status: 'expired' } }),
    ])
    const assignments = await db.roleAssignment.findMany({
      orderBy: { createdAt: 'desc' }, take: 30,
      select: {
        id: true, role: true, status: true, departmentCode: true, expiresAt: true,
        user: { select: { name: true, email: true } },
        subject: { select: { code: true, name: true } },
        classGroup: { select: { name: true, code: true } },
      },
    })
    return {
      ...base,
      metrics: [
        { label: 'Active assignments', value: format(active), detail: 'Currently effective', tone: 'good' },
        { label: 'Suspended', value: format(suspended), detail: 'Temporarily blocked', tone: suspended ? 'warning' : 'default' },
        { label: 'Expired', value: format(expired), detail: 'Historical scope' },
      ],
      rows: assignments.map((assignment) => ({
        id: assignment.id,
        title: `${assignment.user.name} · ${assignment.role}`,
        subtitle: assignment.subject
          ? `${assignment.subject.code} · ${assignment.subject.name}`
          : assignment.classGroup
            ? text(assignment.classGroup.code, assignment.classGroup.name)
            : text(assignment.departmentCode, assignment.user.email),
        status: assignment.status,
        meta: assignment.expiresAt ? `Expires ${date(assignment.expiresAt)}` : 'No expiry',
      })),
      emptyMessage: 'No authority assignments have been created.',
    }
  }

  if (key === 'invitations') {
    const [active, used, revoked] = await Promise.all([
      db.inviteCode.count({ where: { status: 'active', revokedAt: null } }),
      db.inviteCode.count({ where: { used: true } }),
      db.inviteCode.count({ where: { status: 'revoked' } }),
    ])
    const invites = await db.inviteCode.findMany({
      orderBy: { createdAt: 'desc' }, take: 30,
      select: { id: true, code: true, role: true, email: true, name: true, status: true, useCount: true, maxUses: true, expiresAt: true },
    })
    return {
      ...base,
      metrics: [
        { label: 'Active invitations', value: format(active), detail: 'Available for redemption', tone: 'good' },
        { label: 'Redeemed', value: format(used), detail: 'Successfully used' },
        { label: 'Revoked', value: format(revoked), detail: 'No longer valid' },
      ],
      rows: invites.map((invite) => ({
        id: invite.id,
        title: `${invite.code} · ${invite.role}`,
        subtitle: text(invite.email, invite.name || 'General invitation'),
        status: invite.status,
        meta: `${invite.useCount}/${invite.maxUses} uses · ${invite.expiresAt ? `expires ${date(invite.expiresAt)}` : 'no expiry'}`,
      })),
      emptyMessage: 'No invitations have been created.',
    }
  }

  if (key === 'role-requests') {
    const [pending, approved, rejected] = await Promise.all([
      db.roleRequest.count({ where: { status: 'pending' } }),
      db.roleRequest.count({ where: { status: 'approved' } }),
      db.roleRequest.count({ where: { status: 'rejected' } }),
    ])
    const requests = await db.roleRequest.findMany({
      orderBy: { createdAt: 'desc' }, take: 30,
      select: { id: true, requestedRole: true, status: true, reason: true, departmentCode: true, createdAt: true, user: { select: { name: true, email: true } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Pending review', value: format(pending), detail: 'Needs an Admin decision', tone: pending ? 'warning' : 'good' },
        { label: 'Approved', value: format(approved), detail: 'Granted through review' },
        { label: 'Rejected', value: format(rejected), detail: 'Closed requests' },
      ],
      rows: requests.map((request) => ({
        id: request.id,
        title: `${request.user.name} requested ${request.requestedRole}`,
        subtitle: text(request.reason, request.user.email),
        status: request.status,
        meta: `${text(request.departmentCode, 'No department')} · ${date(request.createdAt)}`,
      })),
      emptyMessage: 'There are no role requests.',
    }
  }

  if (key === 'institution') {
    const institutions = await db.institution.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true, city: true, createdAt: true, _count: { select: { departments: true, schemes: true, classGroups: true } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Institutions', value: format(institutions.length), detail: 'Configured tenants' },
        { label: 'Departments', value: format(institutions.reduce((sum, row) => sum + row._count.departments, 0)), detail: 'Institution-owned' },
        { label: 'Schemes', value: format(institutions.reduce((sum, row) => sum + row._count.schemes, 0)), detail: 'Academic revisions' },
        { label: 'Class groups', value: format(institutions.reduce((sum, row) => sum + row._count.classGroups, 0)), detail: 'Operational classes' },
      ],
      rows: institutions.map((institution) => ({
        id: institution.id,
        title: `${institution.code} · ${institution.name}`,
        subtitle: text(institution.city, 'City not configured'),
        status: 'active',
        meta: `Created ${date(institution.createdAt)}`,
      })),
      emptyMessage: 'No institution is configured.',
    }
  }

  if (key === 'departments') {
    const departments = await db.department.findMany({
      orderBy: { code: 'asc' }, take: 50,
      select: { id: true, name: true, code: true, status: true, category: true, createdAt: true, institution: { select: { code: true } }, _count: { select: { programmes: true, classGroups: true } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Departments', value: format(departments.length), detail: 'Configured records' },
        { label: 'Active', value: format(departments.filter((row) => row.status === 'active').length), detail: 'Available operationally', tone: 'good' },
        { label: 'Programmes', value: format(departments.reduce((sum, row) => sum + row._count.programmes, 0)), detail: 'Owned by departments' },
        { label: 'Classes', value: format(departments.reduce((sum, row) => sum + row._count.classGroups, 0)), detail: 'Mapped class groups' },
      ],
      rows: departments.map((department) => ({
        id: department.id,
        title: `${department.code} · ${department.name}`,
        subtitle: `${department.institution.code} · ${text(department.category, 'Academic department')}`,
        status: department.status,
        meta: `${department._count.programmes} programmes · ${department._count.classGroups} classes`,
      })),
      emptyMessage: 'No departments are configured.',
    }
  }

  if (key === 'programmes') {
    const programmes = await db.programme.findMany({
      orderBy: { code: 'asc' }, take: 50,
      select: { id: true, name: true, code: true, status: true, durationSemesters: true, intake: true, department: { select: { code: true, name: true } }, _count: { select: { schemes: true, classGroups: true } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Programmes', value: format(programmes.length), detail: 'Configured programmes' },
        { label: 'Active', value: format(programmes.filter((row) => row.status === 'active').length), detail: 'Currently offered', tone: 'good' },
        { label: 'Schemes', value: format(programmes.reduce((sum, row) => sum + row._count.schemes, 0)), detail: 'Revision records' },
        { label: 'Class groups', value: format(programmes.reduce((sum, row) => sum + row._count.classGroups, 0)), detail: 'Programme classes' },
      ],
      rows: programmes.map((programme) => ({
        id: programme.id,
        title: `${programme.code} · ${programme.name}`,
        subtitle: `${programme.department.code} · ${programme.department.name}`,
        status: programme.status,
        meta: `${programme.durationSemesters ?? '—'} semesters · intake ${programme.intake ?? '—'}`,
      })),
      emptyMessage: 'No programmes are configured.',
    }
  }

  if (key === 'schemes') {
    const schemes = await db.academicScheme.findMany({
      orderBy: { startYear: 'desc' }, take: 50,
      select: { id: true, name: true, code: true, status: true, startYear: true, endYear: true, revisionLabel: true, programme: { select: { code: true, name: true } }, _count: { select: { semesters: true, subjects: true } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Schemes', value: format(schemes.length), detail: 'Academic revisions' },
        { label: 'Published', value: format(schemes.filter((row) => row.status === 'published').length), detail: 'Live revisions', tone: 'good' },
        { label: 'Semesters', value: format(schemes.reduce((sum, row) => sum + row._count.semesters, 0)), detail: 'Scheme structure' },
        { label: 'Subjects', value: format(schemes.reduce((sum, row) => sum + row._count.subjects, 0)), detail: 'Mapped curriculum' },
      ],
      rows: schemes.map((scheme) => ({
        id: scheme.id,
        title: `${scheme.code} · ${scheme.name}`,
        subtitle: scheme.programme ? `${scheme.programme.code} · ${scheme.programme.name}` : 'Institution-wide scheme',
        status: scheme.status,
        meta: `${scheme.startYear}${scheme.endYear ? `–${scheme.endYear}` : ''} · ${text(scheme.revisionLabel, 'Base revision')}`,
      })),
      emptyMessage: 'No schemes or revisions are configured.',
    }
  }

  if (key === 'semesters') {
    const semesters = await db.semester.findMany({
      orderBy: [{ scheme: { startYear: 'desc' } }, { number: 'asc' }], take: 60,
      select: { id: true, number: true, name: true, subtitle: true, scheme: { select: { code: true, name: true, status: true } }, _count: { select: { subjects: true, classGroups: true } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Semesters', value: format(semesters.length), detail: 'Across all schemes' },
        { label: 'Subjects', value: format(semesters.reduce((sum, row) => sum + row._count.subjects, 0)), detail: 'Semester offerings' },
        { label: 'Class groups', value: format(semesters.reduce((sum, row) => sum + row._count.classGroups, 0)), detail: 'Semester classes' },
      ],
      rows: semesters.map((semester) => ({
        id: semester.id,
        title: `${semester.scheme.code} · ${semester.name}`,
        subtitle: text(semester.subtitle, semester.scheme.name),
        status: semester.scheme.status,
        meta: `${semester._count.subjects} subjects · ${semester._count.classGroups} classes`,
      })),
      emptyMessage: 'No semesters are configured.',
    }
  }

  if (key === 'class-groups') {
    const groups = await db.classGroup.findMany({
      orderBy: { updatedAt: 'desc' }, take: 60,
      select: { id: true, name: true, code: true, status: true, semesterNumber: true, division: true, academicYear: true, department: { select: { code: true } }, _count: { select: { memberships: true, teachingAssignments: true } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Class groups', value: format(groups.length), detail: 'Configured classes' },
        { label: 'Active', value: format(groups.filter((row) => row.status === 'active').length), detail: 'Current academic use', tone: 'good' },
        { label: 'Memberships', value: format(groups.reduce((sum, row) => sum + row._count.memberships, 0)), detail: 'Students and CRs' },
        { label: 'Teaching links', value: format(groups.reduce((sum, row) => sum + row._count.teachingAssignments, 0)), detail: 'Subject responsibilities' },
      ],
      rows: groups.map((group) => ({
        id: group.id,
        title: `${text(group.code, group.name)} · ${group.name}`,
        subtitle: `${group.department?.code ?? 'No department'} · Sem ${group.semesterNumber ?? '—'} · Div ${group.division ?? '—'}`,
        status: group.status,
        meta: `${group._count.memberships} members · ${text(group.academicYear, 'Year not set')}`,
      })),
      emptyMessage: 'No class groups are configured.',
    }
  }

  if (key === 'source-registry') {
    const [registered, approved, snapshots] = await Promise.all([
      db.syllabusDocument.count(),
      db.syllabusDocument.count({ where: { approvedAt: { not: null } } }),
      db.sourceSnapshot.count(),
    ])
    const sources = await db.syllabusDocument.findMany({
      orderBy: { updatedAt: 'desc' }, take: 40,
      select: { id: true, title: true, sourceType: true, status: true, trustLevel: true, revisionLabel: true, approvedAt: true, updatedAt: true },
    })
    return {
      ...base,
      metrics: [
        { label: 'Registered sources', value: format(registered), detail: 'Source documents' },
        { label: 'Approved', value: format(approved), detail: 'Human-approved provenance', tone: 'good' },
        { label: 'Snapshots', value: format(snapshots), detail: 'Checksum-protected copies' },
      ],
      rows: sources.map((source) => ({
        id: source.id,
        title: source.title,
        subtitle: `${source.sourceType} · ${source.trustLevel}`,
        status: source.status,
        meta: `${text(source.revisionLabel, 'No revision')} · updated ${date(source.updatedAt)}`,
      })),
      emptyMessage: 'No syllabus sources are registered.',
    }
  }

  if (key === 'import-center') {
    const [queued, processing, failed, completed] = await Promise.all([
      db.syllabusImportJob.count({ where: { state: 'queued' } }),
      db.syllabusImportJob.count({ where: { state: { in: ['processing', 'extracting', 'normalizing'] } } }),
      db.syllabusImportJob.count({ where: { state: 'failed' } }),
      db.syllabusImportJob.count({ where: { state: { in: ['completed', 'reviewed', 'published'] } } }),
    ])
    const jobs = await db.syllabusImportJob.findMany({
      orderBy: { updatedAt: 'desc' }, take: 40,
      select: { id: true, state: true, parserVersion: true, attemptCount: true, errorCode: true, resultSummary: true, updatedAt: true, syllabusDocument: { select: { title: true } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Queued', value: format(queued), detail: 'Waiting for a worker' },
        { label: 'Processing', value: format(processing), detail: 'Currently running', tone: processing ? 'warning' : 'default' },
        { label: 'Completed', value: format(completed), detail: 'Extraction finished', tone: 'good' },
        { label: 'Failed', value: format(failed), detail: 'Needs attention', tone: failed ? 'danger' : 'default' },
      ],
      rows: jobs.map((job) => ({
        id: job.id,
        title: job.syllabusDocument.title,
        subtitle: text(job.resultSummary, `Parser ${job.parserVersion}`),
        status: job.state,
        meta: `${job.attemptCount} attempts · ${text(job.errorCode, date(job.updatedAt))}`,
      })),
      emptyMessage: 'No syllabus import jobs exist.',
    }
  }

  if (key === 'extraction-review') {
    const [open, warnings, errors, resolved] = await Promise.all([
      db.importFinding.count({ where: { resolutionStatus: 'open' } }),
      db.importFinding.count({ where: { severity: 'warning', resolutionStatus: 'open' } }),
      db.importFinding.count({ where: { severity: 'error', resolutionStatus: 'open' } }),
      db.importFinding.count({ where: { resolutionStatus: 'resolved' } }),
    ])
    const findings = await db.importFinding.findMany({
      orderBy: { createdAt: 'desc' }, take: 50,
      select: { id: true, severity: true, code: true, message: true, pageNumber: true, confidence: true, resolutionStatus: true, importJob: { select: { syllabusDocument: { select: { title: true } } } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Open findings', value: format(open), detail: 'Needs human review', tone: open ? 'warning' : 'good' },
        { label: 'Warnings', value: format(warnings), detail: 'Review recommended' },
        { label: 'Errors', value: format(errors), detail: 'Blocks clean import', tone: errors ? 'danger' : 'default' },
        { label: 'Resolved', value: format(resolved), detail: 'Closed findings', tone: 'good' },
      ],
      rows: findings.map((finding) => ({
        id: finding.id,
        title: `${finding.code} · ${finding.message}`,
        subtitle: finding.importJob.syllabusDocument.title,
        status: finding.resolutionStatus,
        meta: `${finding.severity} · page ${finding.pageNumber ?? '—'} · confidence ${finding.confidence ?? '—'}`,
      })),
      emptyMessage: 'No extraction findings require review.',
    }
  }

  if (key === 'curriculum-studio') {
    const [subjects, units, topics, outcomes] = await Promise.all([
      db.subject.count(), db.unit.count(), db.topic.count(), db.courseOutcome.count(),
    ])
    const subjectRows = await db.subject.findMany({
      orderBy: { createdAt: 'desc' }, take: 40,
      select: { id: true, code: true, name: true, status: true, reviewStatus: true, semester: { select: { name: true } }, _count: { select: { units: true, courseOutcomes: true } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Subjects', value: format(subjects), detail: 'Curriculum offerings' },
        { label: 'Units', value: format(units), detail: 'Structured syllabus units' },
        { label: 'Topics', value: format(topics), detail: 'Learning concepts' },
        { label: 'Course outcomes', value: format(outcomes), detail: 'Outcome framework' },
      ],
      rows: subjectRows.map((subject) => ({
        id: subject.id,
        title: `${subject.code} · ${subject.name}`,
        subtitle: subject.semester.name,
        status: subject.reviewStatus,
        meta: `${subject._count.units} units · ${subject._count.courseOutcomes} outcomes · ${subject.status}`,
      })),
      emptyMessage: 'No curriculum records are available.',
    }
  }

  if (key === 'resource-intelligence') {
    const [resources, mappings, pendingMappings, providers] = await Promise.all([
      db.resource.count(),
      db.resourceTopicMapping.count(),
      db.resourceTopicMapping.count({ where: { status: 'pending' } }),
      db.resourceProvider.count({ where: { status: 'active' } }),
    ])
    const mappingsRows = await db.resourceTopicMapping.findMany({
      orderBy: { updatedAt: 'desc' }, take: 40,
      select: { id: true, coverageType: true, coveragePercent: true, status: true, mappingNote: true, topic: { select: { title: true, unit: { select: { subject: { select: { code: true } } } } } }, resource: { select: { title: true } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Resources', value: format(resources), detail: 'Available learning assets' },
        { label: 'Topic mappings', value: format(mappings), detail: 'Coverage relationships' },
        { label: 'Pending review', value: format(pendingMappings), detail: 'Needs validation', tone: pendingMappings ? 'warning' : 'good' },
        { label: 'Active providers', value: format(providers), detail: 'Connected catalogues' },
      ],
      rows: mappingsRows.map((mapping) => ({
        id: mapping.id,
        title: mapping.resource.title,
        subtitle: `${mapping.topic.unit.subject.code} · ${mapping.topic.title}`,
        status: mapping.status,
        meta: `${mapping.coverageType} · ${mapping.coveragePercent ?? '—'}% · ${text(mapping.mappingNote, 'No note')}`,
      })),
      emptyMessage: 'No resource mappings are available.',
    }
  }

  if (key === 'content-operations') {
    const [draft, review, verified, published] = await Promise.all([
      db.lesson.count({ where: { status: 'draft' } }),
      db.lesson.count({ where: { status: 'under_review' } }),
      db.lesson.count({ where: { status: 'verified' } }),
      db.lesson.count({ where: { status: 'published' } }),
    ])
    const lessons = await db.lesson.findMany({
      orderBy: { updatedAt: 'desc' }, take: 40,
      select: { id: true, title: true, status: true, version: true, aiGenerated: true, updatedAt: true, topic: { select: { title: true, unit: { select: { subject: { select: { code: true } } } } } }, unit: { select: { title: true, subject: { select: { code: true } } } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Draft', value: format(draft), detail: 'Being authored' },
        { label: 'Under review', value: format(review), detail: 'Needs academic decision', tone: review ? 'warning' : 'default' },
        { label: 'Verified', value: format(verified), detail: 'Ready for publishing' },
        { label: 'Published', value: format(published), detail: 'Visible to learners', tone: 'good' },
      ],
      rows: lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        subtitle: lesson.topic ? `${lesson.topic.unit.subject.code} · ${lesson.topic.title}` : lesson.unit ? `${lesson.unit.subject.code} · ${lesson.unit.title}` : 'Unmapped lesson',
        status: lesson.status,
        meta: `v${lesson.version} · ${lesson.aiGenerated ? 'AI-assisted' : 'Human-authored'} · ${date(lesson.updatedAt)}`,
      })),
      emptyMessage: 'No lessons are available in content operations.',
    }
  }

  if (key === 'assessment-studio') {
    const [questions, papers, blueprints, assessments] = await Promise.all([
      db.question.count(), db.questionPaper.count(), db.assessmentBlueprint.count(), db.formalAssessment.count(),
    ])
    const rows = await db.formalAssessment.findMany({
      orderBy: { updatedAt: 'desc' }, take: 30,
      select: { id: true, title: true, status: true, opensAt: true, closesAt: true, publishedAt: true, subjectId: true },
    })
    return {
      ...base,
      metrics: [
        { label: 'Question bank', value: format(questions), detail: 'Questions available' },
        { label: 'Question papers', value: format(papers), detail: 'Composed papers' },
        { label: 'Blueprints', value: format(blueprints), detail: 'Assessment specifications' },
        { label: 'Formal assessments', value: format(assessments), detail: 'Managed assessment records' },
      ],
      rows: rows.map((assessment) => ({
        id: assessment.id,
        title: assessment.title,
        subtitle: `Subject ${assessment.subjectId}`,
        status: assessment.status,
        meta: assessment.publishedAt ? `Published ${date(assessment.publishedAt)}` : `${date(assessment.opensAt)} – ${date(assessment.closesAt)}`,
      })),
      emptyMessage: 'No formal assessments are configured.',
    }
  }

  if (key === 'audit') {
    const [events, highRisk, actors] = await Promise.all([
      db.auditEvent.count(),
      db.auditEvent.count({ where: { riskLevel: { in: ['high', 'critical'] } } }),
      db.auditEvent.groupBy({ by: ['actorUserId'], where: { actorUserId: { not: null } } }),
    ])
    const auditRows = await db.auditEvent.findMany({
      orderBy: { createdAt: 'desc' }, take: 60,
      select: { id: true, action: true, entityType: true, summary: true, riskLevel: true, createdAt: true, actorUser: { select: { name: true, email: true } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Audit events', value: format(events), detail: 'Recorded system actions' },
        { label: 'High-risk events', value: format(highRisk), detail: 'Requires security attention', tone: highRisk ? 'danger' : 'good' },
        { label: 'Distinct actors', value: format(actors.length), detail: 'Users represented in trail' },
      ],
      rows: auditRows.map((event) => ({
        id: event.id,
        title: event.action,
        subtitle: text(event.summary, event.entityType),
        status: text(event.riskLevel, 'normal'),
        meta: `${event.actorUser?.name ?? event.actorUser?.email ?? 'System'} · ${date(event.createdAt)}`,
      })),
      emptyMessage: 'No audit events have been recorded.',
    }
  }

  if (key === 'security') {
    const [activeUsers, disabledUsers, sessions, revokedSessions, admins] = await Promise.all([
      db.user.count({ where: { status: 'active' } }),
      db.user.count({ where: { status: 'disabled' } }),
      db.session.count(),
      db.user.count({ where: { sessionsRevokedAt: { not: null } } }),
      db.user.count({ where: { role: 'admin', status: 'active' } }),
    ])
    const users = await db.user.findMany({
      orderBy: { updatedAt: 'desc' }, take: 40,
      select: { id: true, name: true, email: true, role: true, status: true, provider: true, sessionsRevokedAt: true, lastReauthenticatedAt: true, updatedAt: true },
    })
    return {
      ...base,
      metrics: [
        { label: 'Active accounts', value: format(activeUsers), detail: 'Can sign in', tone: 'good' },
        { label: 'Disabled accounts', value: format(disabledUsers), detail: 'Access blocked', tone: disabledUsers ? 'warning' : 'default' },
        { label: 'Live sessions', value: format(sessions), detail: 'Database sessions' },
        { label: 'Active admins', value: format(admins), detail: `${format(revokedSessions)} users with session revocation history` },
      ],
      rows: users.map((user) => ({
        id: user.id,
        title: `${user.name} · ${user.role}`,
        subtitle: `${user.email} · ${user.provider}`,
        status: user.status,
        meta: user.sessionsRevokedAt ? `Sessions revoked ${date(user.sessionsRevokedAt)}` : `Updated ${date(user.updatedAt)}`,
      })),
      emptyMessage: 'No account security data is available.',
    }
  }

  if (key === 'ai-governance') {
    const [sessions, aiLessons, aiQuestions, tutorMessages] = await Promise.all([
      db.tutorSession.count(),
      db.lesson.count({ where: { aiGenerated: true } }),
      db.question.count({ where: { source: 'generated' } }),
      db.tutorMessage.count(),
    ])
    const recentSessions = await db.tutorSession.findMany({
      orderBy: { updatedAt: 'desc' }, take: 30,
      select: { id: true, title: true, subjectId: true, createdAt: true, updatedAt: true, user: { select: { name: true, email: true } }, _count: { select: { messages: true } } },
    })
    return {
      ...base,
      metrics: [
        { label: 'Tutor sessions', value: format(sessions), detail: 'AI learning conversations' },
        { label: 'Tutor messages', value: format(tutorMessages), detail: 'Conversation volume' },
        { label: 'AI-assisted lessons', value: format(aiLessons), detail: 'Requires review controls' },
        { label: 'Generated questions', value: format(aiQuestions), detail: 'Question-bank generation' },
      ],
      rows: recentSessions.map((session) => ({
        id: session.id,
        title: text(session.title, 'Untitled tutor session'),
        subtitle: `${session.user.name || session.user.email} · subject ${text(session.subjectId, 'general')}`,
        status: 'recorded',
        meta: `${session._count.messages} messages · ${date(session.updatedAt)}`,
      })),
      emptyMessage: 'No AI session activity is recorded.',
    }
  }

  if (key === 'jobs-integrations') {
    const [queued, running, failed, integrations] = await Promise.all([
      db.jobRun.count({ where: { state: 'queued' } }),
      db.jobRun.count({ where: { state: { in: ['running', 'processing'] } } }),
      db.jobRun.count({ where: { state: 'failed' } }),
      db.integrationHealth.count(),
    ])
    const jobs = await db.jobRun.findMany({
      orderBy: { updatedAt: 'desc' }, take: 40,
      select: { id: true, key: true, jobType: true, state: true, attemptCount: true, errorCode: true, updatedAt: true },
    })
    return {
      ...base,
      metrics: [
        { label: 'Queued jobs', value: format(queued), detail: 'Waiting for processing' },
        { label: 'Running', value: format(running), detail: 'Currently executing', tone: running ? 'warning' : 'default' },
        { label: 'Failed', value: format(failed), detail: 'Needs operator attention', tone: failed ? 'danger' : 'good' },
        { label: 'Health checks', value: format(integrations), detail: 'Integration observations' },
      ],
      rows: jobs.map((job) => ({
        id: job.id,
        title: `${job.key} · ${job.jobType}`,
        subtitle: text(job.errorCode, 'No recorded error'),
        status: job.state,
        meta: `${job.attemptCount} attempts · ${date(job.updatedAt)}`,
      })),
      emptyMessage: 'No background jobs are recorded.',
    }
  }

  if (key === 'settings') {
    const [flags, enabledFlags, providers, notices] = await Promise.all([
      db.featureFlag.count(),
      db.featureFlag.count({ where: { enabled: true } }),
      db.resourceProvider.count(),
      db.notice.count(),
    ])
    const settings = await db.featureFlag.findMany({
      orderBy: { updatedAt: 'desc' }, take: 40,
      select: { id: true, key: true, enabled: true, environment: true, rolloutPercent: true, description: true, updatedAt: true },
    })
    return {
      ...base,
      metrics: [
        { label: 'Feature flags', value: format(flags), detail: `${format(enabledFlags)} enabled` },
        { label: 'Resource providers', value: format(providers), detail: 'Configured integrations' },
        { label: 'Notices', value: format(notices), detail: 'Institution communications' },
      ],
      rows: settings.map((setting) => ({
        id: setting.id,
        title: setting.key,
        subtitle: text(setting.description, `${setting.environment} environment`),
        status: setting.enabled ? 'enabled' : 'disabled',
        meta: `${setting.rolloutPercent ?? 100}% rollout · ${date(setting.updatedAt)}`,
      })),
      emptyMessage: 'No system feature flags are configured.',
    }
  }

  notFound()
}

export async function getAdminCommandCenterData() {
  const [
    users,
    activeUsers,
    pendingRequests,
    activeAssignments,
    departments,
    subjects,
    publishedLessons,
    openFindings,
    failedImports,
    failedJobs,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: 'active' } }),
    db.roleRequest.count({ where: { status: 'pending' } }),
    db.roleAssignment.count({ where: { status: 'active', revokedAt: null } }),
    db.department.count({ where: { status: 'active' } }),
    db.subject.count({ where: { status: 'active' } }),
    db.lesson.count({ where: { status: 'published' } }),
    db.importFinding.count({ where: { resolutionStatus: 'open' } }),
    db.syllabusImportJob.count({ where: { state: 'failed' } }),
    db.jobRun.count({ where: { state: 'failed' } }),
  ])

  const recentEvents = await db.auditEvent.findMany({
    orderBy: { createdAt: 'desc' }, take: 8,
    select: { id: true, action: true, summary: true, riskLevel: true, createdAt: true, actorUser: { select: { name: true, email: true } } },
  })

  return {
    metrics: [
      { label: 'Active users', value: format(activeUsers), detail: `${format(users)} registered accounts`, tone: 'good' as const },
      { label: 'Pending role requests', value: format(pendingRequests), detail: 'Awaiting an Admin decision', tone: pendingRequests ? 'warning' as const : 'good' as const },
      { label: 'Authority assignments', value: format(activeAssignments), detail: 'Active scoped responsibilities' },
      { label: 'Academic coverage', value: format(subjects), detail: `${format(departments)} departments · ${format(publishedLessons)} published lessons` },
    ],
    alerts: [
      { label: 'Open extraction findings', value: openFindings, href: '/admin/extraction-review', severity: openFindings ? 'warning' : 'good' },
      { label: 'Failed syllabus imports', value: failedImports, href: '/admin/import-center', severity: failedImports ? 'danger' : 'good' },
      { label: 'Failed background jobs', value: failedJobs, href: '/admin/jobs-integrations', severity: failedJobs ? 'danger' : 'good' },
    ],
    recentEvents: recentEvents.map((event) => ({
      id: event.id,
      title: event.action,
      subtitle: text(event.summary, 'System event'),
      status: text(event.riskLevel, 'normal'),
      meta: `${event.actorUser?.name ?? event.actorUser?.email ?? 'System'} · ${date(event.createdAt)}`,
    })),
  }
}
