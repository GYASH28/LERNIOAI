import 'server-only'

import { hash } from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/auth'
import {
  CAMPUS_DIVISIONS,
  DEFAULT_CAMPUS_PROFILE,
  getProgrammeByDepartmentCode,
  isElevatedCampusRole,
  normalizeCampusRole,
  normalizeEmail,
  validateCampusEmail,
  validateRollNumber,
  type CampusRole,
} from '@/lib/campus-auth'

export const campusSignUpSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: z.string().trim().refine(validateCampusEmail, 'Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
  rollNumber: z.string().trim().optional(),
  departmentCode: z.string().trim().optional(),
  semesterNumber: z.coerce.number().int().min(1).max(16).optional(),
  division: z.string().trim().optional(),
  inviteCode: z.string().trim().optional(),
})

export const campusProfileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  rollNumber: z.string().trim().optional(),
  departmentCode: z.string().trim().min(1),
  semesterNumber: z.coerce.number().int().min(1).max(16),
  division: z.string().trim().min(1),
})

export type CampusSignUpInput = z.infer<typeof campusSignUpSchema>
export type CampusProfileInput = z.infer<typeof campusProfileSchema>

type ResolvedProgramme = {
  departmentCode: string
  departmentName: string
  programmeCode: string
  programmeName: string
}

function normalizeInviteCode(code: unknown): string {
  return String(code || '').trim().toUpperCase()
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002')
}

export async function resolveProgrammeFromDatabase(code: unknown): Promise<ResolvedProgramme | null> {
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized) return null

  const programme = await db.programme.findFirst({
    where: {
      status: 'active',
      archivedAt: null,
      OR: [
        { code: normalized },
        { department: { code: normalized, status: 'active', archivedAt: null } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: {
      code: true,
      name: true,
      department: { select: { code: true, name: true } },
    },
  })
  if (programme) {
    return {
      departmentCode: programme.department.code,
      departmentName: programme.department.name,
      programmeCode: programme.code,
      programmeName: programme.name,
    }
  }

  const department = await db.department.findFirst({
    where: { code: normalized, status: 'active', archivedAt: null },
    select: { code: true, name: true },
  })
  if (department) {
    return {
      departmentCode: department.code,
      departmentName: department.name,
      programmeCode: department.code,
      programmeName: department.name,
    }
  }

  const fallback = getProgrammeByDepartmentCode(normalized)
  return fallback ? {
    departmentCode: fallback.departmentCode,
    departmentName: fallback.departmentName,
    programmeCode: fallback.programmeCode,
    programmeName: fallback.programmeName,
  } : null
}

function validateProfileSelection(input: {
  role: CampusRole
  rollNumber?: string | null
  semesterNumber?: number | null
  division?: string | null
}) {
  if (input.semesterNumber !== null && input.semesterNumber !== undefined && (input.semesterNumber < 1 || input.semesterNumber > 16)) {
    throw new ApiError('INVALID_SEMESTER', 'Select a valid semester.', 400, false)
  }
  if (input.division && !CAMPUS_DIVISIONS.includes(input.division as (typeof CAMPUS_DIVISIONS)[number])) {
    throw new ApiError('INVALID_DIVISION', 'Select a valid division.', 400, false)
  }
  if (input.rollNumber && !validateRollNumber(input.rollNumber)) {
    throw new ApiError('INVALID_ROLL_NUMBER', 'Roll number format is not valid for this institution.', 400, false)
  }
}

export async function registerCampusUser(input: CampusSignUpInput) {
  const parsed = campusSignUpSchema.parse(input)
  const email = normalizeEmail(parsed.email)
  const inviteCode = normalizeInviteCode(parsed.inviteCode)
  const requestedProgramme = await resolveProgrammeFromDatabase(parsed.departmentCode)

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    throw new ApiError('ACCOUNT_EXISTS', 'An account may already exist for this email. Try logging in or resetting your password.', 409, false)
  }

  const invite = inviteCode ? await db.inviteCode.findUnique({ where: { code: inviteCode } }) : null
  if (inviteCode && !invite) throw new ApiError('INVALID_INVITE', 'This invite code is invalid or expired.', 400, false)
  if (invite?.revokedAt || invite?.status === 'revoked') throw new ApiError('INVALID_INVITE', 'This invite code has been revoked.', 400, false)
  if (invite?.expiresAt && invite.expiresAt <= new Date()) throw new ApiError('INVALID_INVITE', 'This invite code has expired.', 400, false)
  if (invite && (invite.used || invite.useCount >= invite.maxUses)) throw new ApiError('INVALID_INVITE', 'This invite code has already been used.', 400, false)
  if (invite?.email && normalizeEmail(invite.email) !== email) throw new ApiError('INVALID_INVITE', 'This invite code is assigned to a different email address.', 400, false)

  const role: CampusRole = invite ? normalizeCampusRole(invite.role) : normalizeCampusRole(DEFAULT_CAMPUS_PROFILE.role)
  if (invite && !isElevatedCampusRole(role)) throw new ApiError('INVALID_INVITE', 'This invite code is not valid for elevated access.', 400, false)

  const programme = invite?.departmentCode ? await resolveProgrammeFromDatabase(invite.departmentCode) : requestedProgramme
  if ((parsed.departmentCode || invite?.departmentCode) && !programme) {
    throw new ApiError('INVALID_DEPARTMENT', 'Select a valid department or programme.', 400, false)
  }

  const semesterNumber = Number(invite?.semesterNumber || parsed.semesterNumber || 0) || null
  const division = invite?.division || parsed.division || 'NOT_SURE'
  const rollNumber = invite?.rollNumber || parsed.rollNumber || ''
  validateProfileSelection({ role, rollNumber, semesterNumber, division })

  const passwordHash = await hash(parsed.password, 12)
  const userData = {
    name: invite?.name || parsed.name,
    email,
    passwordHash,
    role,
    status: invite?.status || 'active',
    provider: 'password',
    profileComplete: Boolean(programme && semesterNumber && division !== 'NOT_SURE'),
    onboarded: false,
    branch: invite?.branch || programme?.programmeName || null,
    departmentCode: programme?.departmentCode || null,
    departmentName: programme?.departmentName || null,
    semesterNumber,
    division,
    rollNumber,
    isCR: role === 'cr',
    assignedSubjects: invite?.assignedSubjects || '[]',
  }

  try {
    if (!invite) return await db.user.create({ data: userData })

    return await db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: userData })
      const marked = await tx.inviteCode.updateMany({
        where: { id: invite.id, used: false, revokedAt: null, status: 'active', useCount: { lt: invite.maxUses } },
        data: { used: invite.useCount + 1 >= invite.maxUses, useCount: { increment: 1 }, usedBy: user.id, usedAt: new Date() },
      })
      if (marked.count !== 1) throw new ApiError('INVALID_INVITE', 'This invite code was already used. Request a new invite and try again.', 409, false)

      await tx.roleAuditLog.create({
        data: { actorUserId: invite.createdBy, targetUserId: user.id, action: 'invite_redeemed', role, scope: invite.departmentCode || null, note: `Invite ${invite.id} redeemed during signup.` },
      })
      return user
    })
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new ApiError('ACCOUNT_EXISTS', 'An account may already exist for this email. Try logging in or resetting your password.', 409, false)
    }
    throw error
  }
}

export async function completeCampusProfile(userId: string, input: CampusProfileInput) {
  const parsed = campusProfileSchema.parse(input)
  const current = await db.user.findUnique({ where: { id: userId } })
  if (!current) throw new Error('Missing authenticated user.')

  const role = normalizeCampusRole(current.role)
  const programme = await resolveProgrammeFromDatabase(parsed.departmentCode)
  if (!programme) throw new Error('Select a valid department or programme.')
  validateProfileSelection({ role, rollNumber: parsed.rollNumber || '', semesterNumber: parsed.semesterNumber, division: parsed.division })

  return db.user.update({
    where: { id: userId },
    data: {
      name: parsed.name,
      branch: programme.programmeName,
      departmentCode: programme.departmentCode,
      departmentName: programme.departmentName,
      semesterNumber: parsed.semesterNumber,
      division: parsed.division,
      rollNumber: parsed.rollNumber || '',
      profileComplete: true,
      onboarded: true,
      status: current.status || 'active',
      provider: current.provider || 'oauth',
    },
  })
}
