import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, okResponse, requireActiveRole, withApi } from '@/lib/auth'
import { writeAuditEvent } from '@/lib/authority/audit'
import { ROLES, normalizeRole } from '@/lib/roles'

export const runtime = 'nodejs'

const MAX_PAGE_SIZE = 50
const ELEVATED_INVITE_ROLES = ['cr', 'teacher', 'coordinator', 'reviewer', 'moderator', 'admin'] as const
const ROLE_PREFIX: Record<(typeof ELEVATED_INVITE_ROLES)[number], string> = {
  cr: 'CR', teacher: 'TEA', coordinator: 'HOD', reviewer: 'REV', moderator: 'MOD', admin: 'ADM',
}

function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new ApiError('VALIDATION_ERROR', result.error.issues[0]?.message ?? 'Check the submitted values.', 400, false)
  }
  return result.data
}

function cleanDate(value: string | null | undefined) {
  return value ? new Date(value) : null
}

async function uniqueInviteCode(role: (typeof ELEVATED_INVITE_ROLES)[number]) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `LRN-${ROLE_PREFIX[role]}-${randomBytes(4).toString('hex').toUpperCase()}`
    const exists = await db.inviteCode.findUnique({ where: { code }, select: { id: true } })
    if (!exists) return code
  }
  throw new ApiError('CODE_GENERATION_FAILED', 'Could not generate a unique invite code. Try again.', 503, true)
}

async function getControlPlaneData() {
  const [institutions, departments, programmes, schemes, semesters, classGroups, invitations, notices, featureFlags, totals] = await Promise.all([
    db.institution.findMany({
      orderBy: [{ code: 'asc' }, { name: 'asc' }], take: 100,
      select: { id: true, name: true, code: true, city: true, createdAt: true, _count: { select: { departments: true, schemes: true, classGroups: true } } },
    }),
    db.department.findMany({
      orderBy: [{ status: 'asc' }, { code: 'asc' }], take: 300,
      select: {
        id: true, name: true, code: true, category: true, status: true, institutionId: true, officialUrl: true, archivedAt: true,
        institution: { select: { code: true, name: true } },
        _count: { select: { programmes: true, classGroups: true, roleAssignments: true } },
      },
    }),
    db.programme.findMany({
      orderBy: [{ status: 'asc' }, { code: 'asc' }], take: 300,
      select: {
        id: true, name: true, code: true, durationSemesters: true, status: true, intake: true, intakeNote: true, departmentId: true, archivedAt: true,
        department: { select: { code: true, name: true, institutionId: true } },
        _count: { select: { schemes: true, classGroups: true } },
      },
    }),
    db.academicScheme.findMany({
      orderBy: [{ startYear: 'desc' }, { name: 'asc' }], take: 300,
      select: {
        id: true, name: true, code: true, startYear: true, endYear: true, revisionLabel: true, status: true,
        institutionId: true, programmeId: true, effectiveFrom: true, effectiveTo: true, archivedAt: true,
        programme: { select: { code: true, name: true } }, institution: { select: { code: true, name: true } },
        _count: { select: { semesters: true, subjects: true, classGroups: true } },
      },
    }),
    db.semester.findMany({
      orderBy: [{ schemeId: 'asc' }, { number: 'asc' }], take: 500,
      select: {
        id: true, number: true, name: true, subtitle: true, color: true, schemeId: true,
        scheme: { select: { code: true, name: true, programmeId: true } },
        _count: { select: { subjects: true, classGroups: true, roleAssignments: true } },
      },
    }),
    db.classGroup.findMany({
      orderBy: [{ status: 'asc' }, { academicYear: 'desc' }, { name: 'asc' }], take: 500,
      select: {
        id: true, name: true, code: true, semesterNumber: true, division: true, academicYear: true, status: true,
        institutionId: true, departmentId: true, programmeId: true, schemeId: true, semesterId: true,
        department: { select: { code: true, name: true } }, programme: { select: { code: true, name: true } }, semester: { select: { number: true, name: true } },
        _count: { select: { memberships: true, teachingAssignments: true, roleAssignments: true } },
      },
    }),
    db.inviteCode.findMany({
      orderBy: { createdAt: 'desc' }, take: 300,
      select: {
        id: true, code: true, role: true, status: true, used: true, usedBy: true, usedAt: true, name: true, email: true,
        branch: true, departmentCode: true, departmentName: true, semesterNumber: true, division: true, classGroupId: true,
        subjectId: true, assignedSubjects: true, maxUses: true, useCount: true, expiresAt: true, revokedAt: true, deliveryStatus: true, createdAt: true,
      },
    }),
    db.notice.findMany({
      orderBy: { updatedAt: 'desc' }, take: 200,
      select: { id: true, title: true, body: true, status: true, startsAt: true, expiresAt: true, createdAt: true, updatedAt: true, _count: { select: { audienceTargets: true } } },
    }),
    db.featureFlag.findMany({
      orderBy: [{ enabled: 'desc' }, { key: 'asc' }], take: 300,
      select: { id: true, key: true, institutionId: true, environment: true, enabled: true, rolloutPercent: true, cohortJson: true, description: true, updatedAt: true },
    }),
    Promise.all([db.user.count(), db.subject.count(), db.lesson.count(), db.question.count(), db.resource.count(), db.auditEvent.count()]),
  ])
  const [users, subjects, lessons, questions, resources, auditEvents] = totals
  return {
    institutions, departments, programmes, schemes, semesters, classGroups, invitations, notices, featureFlags,
    summary: {
      users, subjects, lessons, questions, resources, auditEvents,
      activeDepartments: departments.filter((item) => item.status === 'active').length,
      activeInvitations: invitations.filter((item) => item.status === 'active' && !item.revokedAt).length,
      draftNotices: notices.filter((item) => item.status === 'draft').length,
      enabledFlags: featureFlags.filter((item) => item.enabled).length,
    },
  }
}

async function audit(actorUserId: string, action: string, entityType: string, entityId: string | null, summary: string, metadata?: Record<string, unknown>) {
  await writeAuditEvent({ actorUserId, action, entityType, entityId, summary, metadata: metadata ?? null })
}

async function runControlAction(body: unknown, actorUserId: string) {
  const base = parse(z.object({ action: z.string().trim().min(1) }).passthrough(), body)

  if (base.action === 'institution.create') {
    const input = parse(z.object({ action: z.literal('institution.create'), code: z.string().trim().min(2).max(24), name: z.string().trim().min(2).max(160), city: z.string().trim().max(120).nullable().optional() }), body)
    const code = input.code.toUpperCase()
    if (await db.institution.findUnique({ where: { code }, select: { id: true } })) throw new ApiError('DUPLICATE_CODE', 'An institution with this code already exists.', 409, false)
    const item = await db.institution.create({ data: { code, name: input.name, city: input.city || null } })
    await audit(actorUserId, 'institution.created', 'Institution', item.id, `Created institution ${code}.`, { code, name: input.name })
    return { item }
  }

  if (base.action === 'institution.update') {
    const input = parse(z.object({ action: z.literal('institution.update'), id: z.string().min(1), name: z.string().trim().min(2).max(160), city: z.string().trim().max(120).nullable().optional() }), body)
    const item = await db.institution.update({ where: { id: input.id }, data: { name: input.name, city: input.city || null } })
    await audit(actorUserId, 'institution.updated', 'Institution', item.id, `Updated institution ${item.code}.`, { name: input.name, city: input.city })
    return { item }
  }

  if (base.action === 'department.create') {
    const input = parse(z.object({ action: z.literal('department.create'), institutionId: z.string().min(1), code: z.string().trim().min(2).max(32), name: z.string().trim().min(2).max(160), category: z.string().trim().max(80).nullable().optional(), officialUrl: z.string().trim().url().nullable().optional() }), body)
    const code = input.code.toUpperCase()
    const duplicate = await db.department.findFirst({ where: { institutionId: input.institutionId, code }, select: { id: true } })
    if (duplicate) throw new ApiError('DUPLICATE_CODE', 'This department code already exists in the institution.', 409, false)
    const item = await db.department.create({ data: { institutionId: input.institutionId, code, name: input.name, category: input.category || null, officialUrl: input.officialUrl || null, status: 'active' } })
    await audit(actorUserId, 'department.created', 'Department', item.id, `Created department ${code}.`, { code, name: input.name, institutionId: input.institutionId })
    return { item }
  }

  if (base.action === 'department.update') {
    const input = parse(z.object({ action: z.literal('department.update'), id: z.string().min(1), name: z.string().trim().min(2).max(160), category: z.string().trim().max(80).nullable().optional(), officialUrl: z.string().trim().url().nullable().optional() }), body)
    const item = await db.department.update({ where: { id: input.id }, data: { name: input.name, category: input.category || null, officialUrl: input.officialUrl || null } })
    await audit(actorUserId, 'department.updated', 'Department', item.id, `Updated department ${item.code}.`, { name: input.name })
    return { item }
  }

  if (base.action === 'department.archive' || base.action === 'department.restore') {
    const input = parse(z.object({ action: z.enum(['department.archive', 'department.restore']), id: z.string().min(1), confirmation: z.string().optional() }), body)
    const current = await db.department.findUnique({ where: { id: input.id }, select: { id: true, code: true } })
    if (!current) throw new ApiError('NOT_FOUND', 'Department not found.', 404, false)
    if (input.action === 'department.archive' && input.confirmation !== current.code) throw new ApiError('CONFIRMATION_REQUIRED', `Type ${current.code} to archive this department.`, 400, false)
    const restoring = input.action === 'department.restore'
    const item = await db.department.update({ where: { id: input.id }, data: { status: restoring ? 'active' : 'archived', archivedAt: restoring ? null : new Date() } })
    await audit(actorUserId, restoring ? 'department.restored' : 'department.archived', 'Department', item.id, `${restoring ? 'Restored' : 'Archived'} department ${item.code}.`)
    return { item }
  }

  if (base.action === 'programme.create') {
    const input = parse(z.object({ action: z.literal('programme.create'), departmentId: z.string().min(1), code: z.string().trim().min(2).max(32), name: z.string().trim().min(2).max(180), durationSemesters: z.coerce.number().int().min(1).max(16).nullable().optional(), intake: z.coerce.number().int().min(0).max(10000).nullable().optional(), intakeNote: z.string().trim().max(300).nullable().optional() }), body)
    const code = input.code.toUpperCase()
    if (await db.programme.findFirst({ where: { departmentId: input.departmentId, code }, select: { id: true } })) throw new ApiError('DUPLICATE_CODE', 'This programme code already exists in the department.', 409, false)
    const item = await db.programme.create({ data: { departmentId: input.departmentId, code, name: input.name, durationSemesters: input.durationSemesters ?? null, intake: input.intake ?? null, intakeNote: input.intakeNote || null, status: 'active' } })
    await audit(actorUserId, 'programme.created', 'Programme', item.id, `Created programme ${code}.`, { departmentId: input.departmentId })
    return { item }
  }

  if (base.action === 'programme.update') {
    const input = parse(z.object({ action: z.literal('programme.update'), id: z.string().min(1), name: z.string().trim().min(2).max(180), durationSemesters: z.coerce.number().int().min(1).max(16).nullable().optional(), intake: z.coerce.number().int().min(0).max(10000).nullable().optional(), intakeNote: z.string().trim().max(300).nullable().optional() }), body)
    const item = await db.programme.update({ where: { id: input.id }, data: { name: input.name, durationSemesters: input.durationSemesters ?? null, intake: input.intake ?? null, intakeNote: input.intakeNote || null } })
    await audit(actorUserId, 'programme.updated', 'Programme', item.id, `Updated programme ${item.code}.`)
    return { item }
  }

  if (base.action === 'programme.archive' || base.action === 'programme.restore') {
    const input = parse(z.object({ action: z.enum(['programme.archive', 'programme.restore']), id: z.string().min(1), confirmation: z.string().optional() }), body)
    const current = await db.programme.findUnique({ where: { id: input.id }, select: { id: true, code: true } })
    if (!current) throw new ApiError('NOT_FOUND', 'Programme not found.', 404, false)
    if (input.action === 'programme.archive' && input.confirmation !== current.code) throw new ApiError('CONFIRMATION_REQUIRED', `Type ${current.code} to archive this programme.`, 400, false)
    const restoring = input.action === 'programme.restore'
    const item = await db.programme.update({ where: { id: input.id }, data: { status: restoring ? 'active' : 'archived', archivedAt: restoring ? null : new Date() } })
    await audit(actorUserId, restoring ? 'programme.restored' : 'programme.archived', 'Programme', item.id, `${restoring ? 'Restored' : 'Archived'} programme ${item.code}.`)
    return { item }
  }

  if (base.action === 'scheme.create') {
    const input = parse(z.object({ action: z.literal('scheme.create'), institutionId: z.string().min(1), programmeId: z.string().nullable().optional(), code: z.string().trim().min(1).max(32), name: z.string().trim().min(2).max(180), startYear: z.coerce.number().int().min(1900).max(2200), endYear: z.coerce.number().int().min(1900).max(2200).nullable().optional(), revisionLabel: z.string().trim().max(120).nullable().optional(), status: z.enum(['draft', 'published']).default('draft') }), body)
    const item = await db.academicScheme.create({ data: { institutionId: input.institutionId, programmeId: input.programmeId || null, code: input.code.toUpperCase(), name: input.name, startYear: input.startYear, endYear: input.endYear ?? null, revisionLabel: input.revisionLabel || null, status: input.status } })
    await audit(actorUserId, 'scheme.created', 'AcademicScheme', item.id, `Created scheme ${item.code}.`, { programmeId: input.programmeId })
    return { item }
  }

  if (base.action === 'scheme.update') {
    const input = parse(z.object({ action: z.literal('scheme.update'), id: z.string().min(1), name: z.string().trim().min(2).max(180), endYear: z.coerce.number().int().min(1900).max(2200).nullable().optional(), revisionLabel: z.string().trim().max(120).nullable().optional(), status: z.enum(['draft', 'published', 'archived']) }), body)
    const item = await db.academicScheme.update({ where: { id: input.id }, data: { name: input.name, endYear: input.endYear ?? null, revisionLabel: input.revisionLabel || null, status: input.status, archivedAt: input.status === 'archived' ? new Date() : null } })
    await audit(actorUserId, 'scheme.updated', 'AcademicScheme', item.id, `Updated scheme ${item.code}.`, { status: input.status })
    return { item }
  }

  if (base.action === 'semester.create') {
    const input = parse(z.object({ action: z.literal('semester.create'), schemeId: z.string().min(1), number: z.coerce.number().int().min(1).max(16), name: z.string().trim().min(2).max(120), subtitle: z.string().trim().max(200).nullable().optional(), color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).default('#7c3aed') }), body)
    if (await db.semester.findFirst({ where: { schemeId: input.schemeId, number: input.number }, select: { id: true } })) throw new ApiError('DUPLICATE_SEMESTER', 'This semester already exists in the scheme.', 409, false)
    const item = await db.semester.create({ data: { schemeId: input.schemeId, number: input.number, name: input.name, subtitle: input.subtitle || null, color: input.color } })
    await audit(actorUserId, 'semester.created', 'Semester', item.id, `Created ${item.name}.`, { schemeId: input.schemeId })
    return { item }
  }

  if (base.action === 'semester.update') {
    const input = parse(z.object({ action: z.literal('semester.update'), id: z.string().min(1), name: z.string().trim().min(2).max(120), subtitle: z.string().trim().max(200).nullable().optional(), color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/) }), body)
    const item = await db.semester.update({ where: { id: input.id }, data: { name: input.name, subtitle: input.subtitle || null, color: input.color } })
    await audit(actorUserId, 'semester.updated', 'Semester', item.id, `Updated ${item.name}.`)
    return { item }
  }

  if (base.action === 'semester.delete') {
    const input = parse(z.object({ action: z.literal('semester.delete'), id: z.string().min(1), confirmation: z.literal('DELETE SEMESTER') }), body)
    const current = await db.semester.findUnique({ where: { id: input.id }, select: { id: true, name: true, _count: { select: { subjects: true, classGroups: true, roleAssignments: true } } } })
    if (!current) throw new ApiError('NOT_FOUND', 'Semester not found.', 404, false)
    if (current._count.subjects || current._count.classGroups || current._count.roleAssignments) throw new ApiError('SEMESTER_IN_USE', 'Remove or reassign subjects, classes, and authority records before deleting this semester.', 409, false)
    await db.semester.delete({ where: { id: current.id } })
    await audit(actorUserId, 'semester.deleted', 'Semester', current.id, `Deleted ${current.name}.`)
    return { deletedId: current.id }
  }

  if (base.action === 'classGroup.create') {
    const input = parse(z.object({ action: z.literal('classGroup.create'), institutionId: z.string().min(1), departmentId: z.string().nullable().optional(), programmeId: z.string().nullable().optional(), schemeId: z.string().nullable().optional(), semesterId: z.string().nullable().optional(), name: z.string().trim().min(2).max(160), code: z.string().trim().max(40).nullable().optional(), semesterNumber: z.coerce.number().int().min(1).max(16).nullable().optional(), division: z.string().trim().max(20).nullable().optional(), academicYear: z.string().trim().max(20).nullable().optional() }), body)
    const code = input.code?.toUpperCase() || null
    if (code && await db.classGroup.findFirst({ where: { institutionId: input.institutionId, code }, select: { id: true } })) throw new ApiError('DUPLICATE_CODE', 'This class code already exists in the institution.', 409, false)
    const item = await db.classGroup.create({ data: { institutionId: input.institutionId, departmentId: input.departmentId || null, programmeId: input.programmeId || null, schemeId: input.schemeId || null, semesterId: input.semesterId || null, name: input.name, code, semesterNumber: input.semesterNumber ?? null, division: input.division || null, academicYear: input.academicYear || null, status: 'active' } })
    await audit(actorUserId, 'class_group.created', 'ClassGroup', item.id, `Created class ${item.code || item.name}.`)
    return { item }
  }

  if (base.action === 'classGroup.update') {
    const input = parse(z.object({ action: z.literal('classGroup.update'), id: z.string().min(1), name: z.string().trim().min(2).max(160), semesterNumber: z.coerce.number().int().min(1).max(16).nullable().optional(), division: z.string().trim().max(20).nullable().optional(), academicYear: z.string().trim().max(20).nullable().optional() }), body)
    const item = await db.classGroup.update({ where: { id: input.id }, data: { name: input.name, semesterNumber: input.semesterNumber ?? null, division: input.division || null, academicYear: input.academicYear || null } })
    await audit(actorUserId, 'class_group.updated', 'ClassGroup', item.id, `Updated class ${item.code || item.name}.`)
    return { item }
  }

  if (base.action === 'classGroup.archive' || base.action === 'classGroup.restore') {
    const input = parse(z.object({ action: z.enum(['classGroup.archive', 'classGroup.restore']), id: z.string().min(1), confirmation: z.string().optional() }), body)
    const current = await db.classGroup.findUnique({ where: { id: input.id }, select: { id: true, code: true, name: true } })
    if (!current) throw new ApiError('NOT_FOUND', 'Class group not found.', 404, false)
    const identity = current.code || current.name
    if (input.action === 'classGroup.archive' && input.confirmation !== identity) throw new ApiError('CONFIRMATION_REQUIRED', `Type ${identity} to archive this class.`, 400, false)
    const restoring = input.action === 'classGroup.restore'
    const item = await db.classGroup.update({ where: { id: input.id }, data: { status: restoring ? 'active' : 'archived' } })
    await audit(actorUserId, restoring ? 'class_group.restored' : 'class_group.archived', 'ClassGroup', item.id, `${restoring ? 'Restored' : 'Archived'} class ${identity}.`)
    return { item }
  }

  if (base.action === 'invite.create') {
    const input = parse(z.object({
      action: z.literal('invite.create'), role: z.enum(ELEVATED_INVITE_ROLES), name: z.string().trim().max(120).nullable().optional(), email: z.string().trim().email().max(254).nullable().optional(),
      institutionId: z.string().nullable().optional(), departmentCode: z.string().trim().max(32).nullable().optional(), branch: z.string().trim().max(180).nullable().optional(),
      classGroupId: z.string().nullable().optional(), subjectIds: z.array(z.string().min(1)).max(30).default([]), semesterNumber: z.coerce.number().int().min(1).max(16).nullable().optional(),
      division: z.string().trim().max(20).nullable().optional(), maxUses: z.coerce.number().int().min(1).max(20).default(1), expiresInDays: z.coerce.number().int().min(1).max(90).default(14), confirmation: z.string().optional(),
    }), body)
    if (input.role === 'admin' && input.confirmation !== 'CREATE ADMIN INVITE') throw new ApiError('CONFIRMATION_REQUIRED', 'Type CREATE ADMIN INVITE to create an Admin invite.', 400, false)
    const group = input.classGroupId ? await db.classGroup.findUnique({ where: { id: input.classGroupId }, select: { id: true, institutionId: true, department: { select: { code: true, name: true } } } }) : null
    if (input.role === 'cr' && !group) throw new ApiError('CLASS_REQUIRED', 'A CR invite requires a valid class group.', 400, false)
    const departmentCode = (group?.department?.code || input.departmentCode || '').trim().toUpperCase() || null
    const department = departmentCode ? await db.department.findFirst({ where: { code: departmentCode, status: 'active' }, select: { id: true, name: true, institutionId: true } }) : null
    if ((input.role === 'coordinator' || input.role === 'moderator') && !department && !input.institutionId) throw new ApiError('SCOPE_REQUIRED', 'This role requires an institution or department scope.', 400, false)
    if ((input.role === 'teacher' || input.role === 'reviewer') && input.subjectIds.length === 0 && !department) throw new ApiError('SCOPE_REQUIRED', 'Select at least one subject or a department for this invite.', 400, false)
    if (input.subjectIds.length) {
      const found = await db.subject.count({ where: { id: { in: input.subjectIds } } })
      if (found !== new Set(input.subjectIds).size) throw new ApiError('INVALID_SUBJECT', 'One or more selected subjects no longer exist.', 400, false)
    }
    const code = await uniqueInviteCode(input.role)
    const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000)
    const item = await db.inviteCode.create({
      data: {
        code, tokenHash: createHash('sha256').update(code).digest('hex'), role: input.role, status: 'active', used: false,
        createdBy: actorUserId, name: input.name || null, email: input.email?.toLowerCase() || null, branch: input.branch || null,
        institutionId: group?.institutionId || department?.institutionId || input.institutionId || null, classGroupId: group?.id || null,
        subjectId: input.subjectIds[0] || null, departmentCode, departmentName: group?.department?.name || department?.name || null,
        semesterNumber: input.semesterNumber ?? null, division: input.division || null, assignedSubjects: JSON.stringify(Array.from(new Set(input.subjectIds))),
        maxUses: input.role === 'admin' ? 1 : input.maxUses, useCount: 0, expiresAt, deliveryStatus: 'created',
      },
      select: { id: true, code: true, role: true, status: true, email: true, departmentCode: true, expiresAt: true, maxUses: true },
    })
    await audit(actorUserId, 'invite.created', 'InviteCode', item.id, `Created ${input.role} invite ${code}.`, { role: input.role, email: input.email, departmentCode, maxUses: item.maxUses, expiresAt })
    return { item }
  }

  if (base.action === 'invite.revoke' || base.action === 'invite.restore') {
    const input = parse(z.object({ action: z.enum(['invite.revoke', 'invite.restore']), id: z.string().min(1) }), body)
    const current = await db.inviteCode.findUnique({ where: { id: input.id } })
    if (!current) throw new ApiError('NOT_FOUND', 'Invite code not found.', 404, false)
    const restoring = input.action === 'invite.restore'
    if (restoring && current.expiresAt && current.expiresAt <= new Date()) throw new ApiError('INVITE_EXPIRED', 'Extend or recreate this expired invite instead of restoring it.', 409, false)
    if (restoring && current.useCount >= current.maxUses) throw new ApiError('INVITE_USED', 'This invite has reached its usage limit.', 409, false)
    const item = await db.inviteCode.update({ where: { id: input.id }, data: { status: restoring ? 'active' : 'revoked', revokedAt: restoring ? null : new Date(), revokedBy: restoring ? null : actorUserId, used: restoring ? false : current.used } })
    await audit(actorUserId, restoring ? 'invite.restored' : 'invite.revoked', 'InviteCode', item.id, `${restoring ? 'Restored' : 'Revoked'} invite ${item.code}.`)
    return { item }
  }

  if (base.action === 'invite.delete') {
    const input = parse(z.object({ action: z.literal('invite.delete'), id: z.string().min(1), confirmation: z.literal('DELETE INVITE') }), body)
    const current = await db.inviteCode.findUnique({ where: { id: input.id }, select: { id: true, code: true, used: true, useCount: true, authorityGrantId: true } })
    if (!current) throw new ApiError('NOT_FOUND', 'Invite code not found.', 404, false)
    if (current.used || current.useCount > 0 || current.authorityGrantId) throw new ApiError('INVITE_IN_USE', 'Used or authority-linked invites are retained for audit history and can only be revoked.', 409, false)
    await db.inviteCode.delete({ where: { id: input.id } })
    await audit(actorUserId, 'invite.deleted', 'InviteCode', current.id, `Deleted unused invite ${current.code}.`)
    return { deletedId: current.id }
  }

  if (base.action === 'invite.expire') {
    const count = await db.inviteCode.updateMany({ where: { status: 'active', expiresAt: { lte: new Date() } }, data: { status: 'expired' } })
    await audit(actorUserId, 'invite.expiry_sweep', 'InviteCode', null, `Marked ${count.count} expired invites.`, { count: count.count })
    return { count: count.count }
  }

  if (base.action === 'notice.create') {
    const input = parse(z.object({ action: z.literal('notice.create'), title: z.string().trim().min(2).max(180), body: z.string().trim().min(2).max(10000), status: z.enum(['draft', 'published']).default('draft'), startsAt: z.string().datetime().nullable().optional(), expiresAt: z.string().datetime().nullable().optional(), audience: z.object({ institutionId: z.string().nullable().optional(), departmentId: z.string().nullable().optional(), programmeId: z.string().nullable().optional(), schemeId: z.string().nullable().optional(), semesterId: z.string().nullable().optional(), classGroupId: z.string().nullable().optional(), subjectId: z.string().nullable().optional(), role: z.string().nullable().optional() }).optional() }), body)
    const item = await db.notice.create({ data: { title: input.title, body: input.body, authorId: actorUserId, status: input.status, startsAt: cleanDate(input.startsAt) ?? (input.status === 'published' ? new Date() : null), expiresAt: cleanDate(input.expiresAt) } })
    const audience = input.audience
    if (audience && Object.values(audience).some(Boolean)) await db.audienceTarget.create({ data: { noticeId: item.id, institutionId: audience.institutionId || null, departmentId: audience.departmentId || null, programmeId: audience.programmeId || null, schemeId: audience.schemeId || null, semesterId: audience.semesterId || null, classGroupId: audience.classGroupId || null, subjectId: audience.subjectId || null, role: audience.role || null } })
    await audit(actorUserId, 'notice.created', 'Notice', item.id, `Created notice ${item.title}.`, { status: item.status })
    return { item }
  }

  if (base.action === 'notice.update') {
    const input = parse(z.object({ action: z.literal('notice.update'), id: z.string().min(1), title: z.string().trim().min(2).max(180), body: z.string().trim().min(2).max(10000), startsAt: z.string().datetime().nullable().optional(), expiresAt: z.string().datetime().nullable().optional() }), body)
    const item = await db.notice.update({ where: { id: input.id }, data: { title: input.title, body: input.body, startsAt: cleanDate(input.startsAt), expiresAt: cleanDate(input.expiresAt) } })
    await audit(actorUserId, 'notice.updated', 'Notice', item.id, `Updated notice ${item.title}.`)
    return { item }
  }

  if (base.action === 'notice.publish' || base.action === 'notice.archive') {
    const input = parse(z.object({ action: z.enum(['notice.publish', 'notice.archive']), id: z.string().min(1) }), body)
    const publishing = input.action === 'notice.publish'
    const item = await db.notice.update({ where: { id: input.id }, data: { status: publishing ? 'published' : 'archived', startsAt: publishing ? new Date() : undefined } })
    await audit(actorUserId, publishing ? 'notice.published' : 'notice.archived', 'Notice', item.id, `${publishing ? 'Published' : 'Archived'} notice ${item.title}.`)
    return { item }
  }

  if (base.action === 'notice.delete') {
    const input = parse(z.object({ action: z.literal('notice.delete'), id: z.string().min(1), confirmation: z.literal('DELETE NOTICE') }), body)
    const current = await db.notice.findUnique({ where: { id: input.id }, select: { id: true, title: true, status: true } })
    if (!current) throw new ApiError('NOT_FOUND', 'Notice not found.', 404, false)
    if (!['draft', 'archived'].includes(current.status)) throw new ApiError('NOTICE_PUBLISHED', 'Archive a published notice before deleting it.', 409, false)
    await db.notice.delete({ where: { id: current.id } })
    await audit(actorUserId, 'notice.deleted', 'Notice', current.id, `Deleted notice ${current.title}.`)
    return { deletedId: current.id }
  }

  if (base.action === 'flag.upsert') {
    const input = parse(z.object({ action: z.literal('flag.upsert'), id: z.string().nullable().optional(), key: z.string().trim().min(2).max(120).regex(/^[A-Za-z0-9_.-]+$/), institutionId: z.string().nullable().optional(), environment: z.enum(['all', 'development', 'preview', 'production']).default('all'), enabled: z.boolean(), rolloutPercent: z.coerce.number().int().min(0).max(100).nullable().optional(), description: z.string().trim().max(500).nullable().optional(), cohortJson: z.string().trim().max(10000).nullable().optional() }), body)
    const current = input.id ? await db.featureFlag.findUnique({ where: { id: input.id } }) : await db.featureFlag.findFirst({ where: { key: input.key, institutionId: input.institutionId || null, environment: input.environment } })
    const data = { key: input.key, institutionId: input.institutionId || null, environment: input.environment, enabled: input.enabled, rolloutPercent: input.rolloutPercent ?? null, description: input.description || null, cohortJson: input.cohortJson || null, updatedById: actorUserId }
    const item = current ? await db.featureFlag.update({ where: { id: current.id }, data }) : await db.featureFlag.create({ data })
    await audit(actorUserId, current ? 'feature_flag.updated' : 'feature_flag.created', 'FeatureFlag', item.id, `${current ? 'Updated' : 'Created'} feature flag ${item.key}.`, { enabled: item.enabled, environment: item.environment })
    return { item }
  }

  if (base.action === 'flag.delete') {
    const input = parse(z.object({ action: z.literal('flag.delete'), id: z.string().min(1), confirmation: z.literal('DELETE FLAG') }), body)
    const current = await db.featureFlag.findUnique({ where: { id: input.id }, select: { id: true, key: true } })
    if (!current) throw new ApiError('NOT_FOUND', 'Feature flag not found.', 404, false)
    await db.featureFlag.delete({ where: { id: current.id } })
    await audit(actorUserId, 'feature_flag.deleted', 'FeatureFlag', current.id, `Deleted feature flag ${current.key}.`)
    return { deletedId: current.id }
  }

  throw new ApiError('UNKNOWN_ACTION', 'This control-plane action is not supported.', 400, false)
}

export async function GET(request: Request) {
  return withApi(async () => {
    await requireActiveRole('admin')
    const url = new URL(request.url)
    if (url.searchParams.get('controlPlane') === '1') {
      const data = await getControlPlaneData()
      if (url.searchParams.get('download') === '1') {
        return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2), {
          headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="lernio-admin-export-${new Date().toISOString().slice(0, 10)}.json"` },
        })
      }
      return okResponse(data)
    }

    const q = url.searchParams.get('q')?.trim()
    const role = url.searchParams.get('role')
    const page = Math.max(1, Number(url.searchParams.get('page') || 1))
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get('pageSize') || 20)))
    const where = {
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] } : {}),
      ...(role && ROLES.includes(role as never) ? { role: normalizeRole(role) } : {}),
    }
    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, email: true, name: true, role: true, status: true, departmentCode: true, semesterNumber: true, division: true, profileComplete: true, authorityVersion: true, createdAt: true, updatedAt: true },
      }),
    ])
    return okResponse({ users, pagination: { total, page, pageSize } })
  })
}

const CreateUserSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(120),
  role: z.enum(['student', 'cr', 'teacher', 'coordinator', 'moderator', 'reviewer']).default('student'),
  departmentCode: z.string().trim().max(32).optional(),
})

export async function POST(request: Request) {
  return withApi(async () => {
    const authority = await requireActiveRole('admin')
    const body = await request.json().catch(() => null)
    if (body && typeof body === 'object' && 'action' in body) return okResponse(await runControlAction(body, authority.user.id))

    const parsed = CreateUserSchema.safeParse(body)
    if (!parsed.success) throw new ApiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid user payload.', 400, false)
    const user = await db.user.create({
      data: { email: parsed.data.email, name: parsed.data.name, role: parsed.data.role, status: 'active', provider: 'password', profileComplete: false, preferredLang: 'en', departmentCode: parsed.data.departmentCode ?? null },
      select: { id: true, email: true, name: true, role: true, status: true },
    })
    await audit(authority.user.id, 'user.created', 'User', user.id, `Created user ${user.email}`, { role: user.role, departmentCode: parsed.data.departmentCode ?? null })
    return okResponse({ user })
  })
}
