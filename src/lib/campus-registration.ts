import 'server-only'

import crypto from 'crypto'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'
import { passwordPolicySchema } from '@/lib/schemas'
import {
  CAMPUS_DIVISIONS,
  getProgrammeByDepartmentCode,
  isElevatedCampusRole,
  normalizeCampusRole,
  normalizeEmail,
  validateCampusEmail,
  validateRollNumber,
  type CampusRole,
} from '@/lib/campus-auth'
import { TARGET_CWIT_DEPARTMENT_CODES, TARGET_CWIT_PROGRAMME_CODES } from '@/lib/cwit-departments'

/**
 * Compatibility schema for older callers. Public student registration now only
 * sends name/email/password/inviteCode; legacy campus fields remain optional so
 * historic staff invite flows and migrations do not break.
 */
export const campusSignUpSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: z.string().trim().refine(validateCampusEmail, 'Enter a valid email address.'),
  password: passwordPolicySchema,
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
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002',
  )
}

/**
 * Legacy staff/institution resolver retained only for compatibility with old
 * invite records and the retired complete-profile flow. New student accounts
 * never resolve or persist a diploma programme.
 */
export async function resolveProgrammeFromDatabase(code: unknown): Promise<ResolvedProgramme | null> {
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized) return null

  const programme = await db.programme.findFirst({
    where: {
      code: { in: [...TARGET_CWIT_PROGRAMME_CODES] },
      status: 'active',
      archivedAt: null,
      OR: [
        { code: normalized },
        {
          department: {
            status: 'active',
            archivedAt: null,
            AND: [
              { code: normalized },
              { code: { in: [...TARGET_CWIT_DEPARTMENT_CODES] } },
            ],
          },
        },
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
    where: {
      status: 'active',
      archivedAt: null,
      AND: [
        { code: normalized },
        { code: { in: [...TARGET_CWIT_DEPARTMENT_CODES] } },
      ],
    },
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
  return fallback
    ? {
        departmentCode: fallback.departmentCode,
        departmentName: fallback.departmentName,
        programmeCode: fallback.programmeCode,
        programmeName: fallback.programmeName,
      }
    : null
}

function validateProfileSelection(input: {
  role: CampusRole
  rollNumber?: string | null
  semesterNumber?: number | null
  division?: string | null
}) {
  if (
    input.semesterNumber !== null &&
    input.semesterNumber !== undefined &&
    (input.semesterNumber < 1 || input.semesterNumber > 16)
  ) {
    throw new ApiError('INVALID_SEMESTER', 'Select a valid semester.', 400, false)
  }
  if (
    input.division &&
    !CAMPUS_DIVISIONS.includes(input.division as (typeof CAMPUS_DIVISIONS)[number])
  ) {
    throw new ApiError('INVALID_DIVISION', 'Select a valid division.', 400, false)
  }
  if (input.rollNumber && !validateRollNumber(input.rollNumber)) {
    throw new ApiError(
      'INVALID_ROLL_NUMBER',
      'Roll number format is not valid for this institution.',
      400,
      false,
    )
  }
}

export async function registerCampusUser(input: CampusSignUpInput) {
  const parsed = campusSignUpSchema.parse(input)
  const email = normalizeEmail(parsed.email)
  const inviteCode = normalizeInviteCode(parsed.inviteCode)

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    throw new ApiError(
      'ACCOUNT_EXISTS',
      'An account with this email already exists. Sign in instead.',
      409,
      false,
    )
  }

  const invite = inviteCode
    ? await db.inviteCode.findUnique({ where: { code: inviteCode } })
    : null

  if (inviteCode && !invite) {
    throw new ApiError('INVALID_INVITE', 'This invite code is invalid or expired.', 400, false)
  }
  if (invite?.revokedAt || invite?.status === 'revoked') {
    throw new ApiError('INVALID_INVITE', 'This invite code has been revoked.', 400, false)
  }
  if (invite?.expiresAt && invite.expiresAt <= new Date()) {
    throw new ApiError('INVALID_INVITE', 'This invite code has expired.', 400, false)
  }
  if (invite && (invite.used || invite.useCount >= invite.maxUses)) {
    throw new ApiError('INVALID_INVITE', 'This invite code has already been used.', 400, false)
  }
  if (invite?.email && normalizeEmail(invite.email) !== email) {
    throw new ApiError(
      'INVALID_INVITE',
      'This invite code is assigned to a different email address.',
      400,
      false,
    )
  }

  const role: CampusRole = invite ? normalizeCampusRole(invite.role) : 'student'
  if (invite && !isElevatedCampusRole(role)) {
    throw new ApiError(
      'INVALID_INVITE',
      'This invite code is not valid for elevated access.',
      400,
      false,
    )
  }

  // Institution fields are compatibility-only and may only come from a trusted
  // elevated-role invite. They are never accepted from public student signup.
  const programme = invite?.departmentCode
    ? await resolveProgrammeFromDatabase(invite.departmentCode)
    : null
  if (invite?.departmentCode && !programme) {
    throw new ApiError(
      'INVALID_DEPARTMENT',
      'The staff invite references an unavailable legacy department.',
      400,
      false,
    )
  }

  const semesterNumber = invite?.semesterNumber ? Number(invite.semesterNumber) : null
  const division = invite?.division || 'NOT_SURE'
  const rollNumber = invite?.rollNumber || ''
  validateProfileSelection({ role, rollNumber, semesterNumber, division })

  const passwordHash = await hash(parsed.password, 12)
  const userData = {
    name: invite?.name || parsed.name,
    email,
    passwordHash,
    role,
    // Credentials authorization already blocks disabled accounts. Verification
    // confirmation activates the account, making email verification a real gate.
    status: 'disabled',
    provider: 'password',
    profileComplete: false,
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
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex')
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const user = await db.$transaction(async (tx) => {
      await tx.emailVerificationToken.deleteMany({ where: { email } })

      const createdUser = await tx.user.create({ data: userData })

      await tx.emailVerificationToken.create({
        data: {
          email,
          tokenHash: verificationTokenHash,
          expiresAt: verificationExpiresAt,
        },
      })

      if (!invite) return createdUser

      const marked = await tx.inviteCode.updateMany({
        where: {
          id: invite.id,
          used: false,
          revokedAt: null,
          status: 'active',
          useCount: { lt: invite.maxUses },
        },
        data: {
          used: invite.useCount + 1 >= invite.maxUses,
          useCount: { increment: 1 },
          usedBy: createdUser.id,
          usedAt: new Date(),
        },
      })
      if (marked.count !== 1) {
        throw new ApiError(
          'INVALID_INVITE',
          'This invite code was already used. Request a new invite and try again.',
          409,
          false,
        )
      }

      await tx.roleAuditLog.create({
        data: {
          actorUserId: invite.createdBy,
          targetUserId: createdUser.id,
          action: 'invite_redeemed',
          role,
          scope: invite.departmentCode || null,
          note: `Invite ${invite.id} redeemed during signup.`,
        },
      })
      return createdUser
    })

    // A provider outage should not destroy the account/token pair. The user can
    // safely request a fresh verification email from the existing resend route.
    await sendVerificationEmail(email, verificationToken).catch((error) => {
      console.error('[registration] verification email delivery failed', error)
    })

    return user
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new ApiError(
        'ACCOUNT_EXISTS',
        'An account may already exist for this email. Try logging in or resetting your password.',
        409,
        false,
      )
    }
    throw error
  }
}

/**
 * Retired diploma-profile compatibility helper. New users are routed through
 * StudentAcademicProfile onboarding instead. Keeping this function avoids
 * breaking old administrative migration tooling while no public page calls it.
 */
export async function completeCampusProfile(userId: string, input: CampusProfileInput) {
  const parsed = campusProfileSchema.parse(input)
  const current = await db.user.findUnique({ where: { id: userId } })
  if (!current) throw new Error('Missing authenticated user.')

  const role = normalizeCampusRole(current.role)
  const programme = await resolveProgrammeFromDatabase(parsed.departmentCode)
  if (!programme) throw new Error('Select a valid department or programme.')
  validateProfileSelection({
    role,
    rollNumber: parsed.rollNumber || '',
    semesterNumber: parsed.semesterNumber,
    division: parsed.division,
  })

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
      provider: current.provider || 'password',
    },
  })
}
