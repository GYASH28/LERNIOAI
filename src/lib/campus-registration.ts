import 'server-only'

import { hash } from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  CAMPUS_DIVISIONS,
  CAMPUS_SEMESTERS,
  DEFAULT_CAMPUS_PROFILE,
  getProgrammeByDepartmentCode,
  isElevatedCampusRole,
  normalizeCampusRole,
  normalizeEmail,
  validateCampusEmail,
  validateRollNumber,
  type CampusRole,
} from '@/lib/campus-auth'

const RESERVED_ADMIN_EMAILS = new Set(
  (process.env.LERNIO_RESERVED_ADMIN_EMAILS || 'ultimatebracegaming@gmail.com')
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean),
)

export const campusSignUpSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: z.string().trim().refine(validateCampusEmail, 'Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
  rollNumber: z.string().trim().optional(),
  departmentCode: z.string().trim().min(1),
  semesterNumber: z.coerce.number().int().min(1).max(8),
  division: z.string().trim().min(1),
  inviteCode: z.string().trim().optional(),
})

export const campusProfileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  rollNumber: z.string().trim().optional(),
  departmentCode: z.string().trim().min(1),
  semesterNumber: z.coerce.number().int().min(1).max(8),
  division: z.string().trim().min(1),
})

export type CampusSignUpInput = z.infer<typeof campusSignUpSchema>
export type CampusProfileInput = z.infer<typeof campusProfileSchema>

function normalizeInviteCode(code: unknown): string {
  return String(code || '').trim().toUpperCase()
}

function isReservedAdmin(email: string): boolean {
  return RESERVED_ADMIN_EMAILS.has(normalizeEmail(email))
}

function validateProfileSelection(input: {
  role: CampusRole
  rollNumber?: string | null
  semesterNumber: number
  division: string
}) {
  if (!CAMPUS_SEMESTERS.includes(String(input.semesterNumber) as (typeof CAMPUS_SEMESTERS)[number])) {
    throw new Error('Select a valid semester.')
  }

  if (!CAMPUS_DIVISIONS.includes(input.division as (typeof CAMPUS_DIVISIONS)[number])) {
    throw new Error('Select a valid division.')
  }

  if (['student', 'cr'].includes(input.role) && !validateRollNumber(input.rollNumber)) {
    throw new Error('Roll number must be exactly 6 digits.')
  }
}

export async function registerCampusUser(input: CampusSignUpInput) {
  const parsed = campusSignUpSchema.parse(input)
  const email = normalizeEmail(parsed.email)
  const inviteCode = normalizeInviteCode(parsed.inviteCode)
  const requestedProgramme = getProgrammeByDepartmentCode(parsed.departmentCode)

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error('This email is already registered.')
  }

  const invite = inviteCode
    ? await db.inviteCode.findUnique({ where: { code: inviteCode } })
    : null

  if (inviteCode && !invite) {
    throw new Error('Invalid invite code.')
  }

  if (invite?.used) {
    throw new Error('This invite code has already been used.')
  }

  if (invite?.email && normalizeEmail(invite.email) !== email) {
    throw new Error('This invite code is assigned to a different email address.')
  }

  const role: CampusRole = isReservedAdmin(email)
    ? 'admin'
    : invite
      ? normalizeCampusRole(invite.role)
      : normalizeCampusRole(DEFAULT_CAMPUS_PROFILE.role)

  if (invite && !isElevatedCampusRole(role)) {
    throw new Error('This invite code is not valid for elevated access.')
  }

  const programme = invite?.departmentCode
    ? getProgrammeByDepartmentCode(invite.departmentCode)
    : requestedProgramme

  const semesterNumber = Number(invite?.semesterNumber || parsed.semesterNumber)
  const division = invite?.division || parsed.division
  const rollNumber = invite?.rollNumber || parsed.rollNumber || ''

  validateProfileSelection({ role, rollNumber, semesterNumber, division })

  const passwordHash = await hash(parsed.password, 12)

  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: invite?.name || parsed.name,
        email,
        passwordHash,
        role,
        status: isReservedAdmin(email) ? 'active' : invite?.status || 'active',
        provider: 'password',
        profileComplete: true,
        onboarded: true,
        branch: invite?.branch || programme.programmeName,
        departmentCode: programme.departmentCode,
        departmentName: programme.departmentName,
        semesterNumber,
        division,
        rollNumber,
        isCR: role === 'cr',
        assignedSubjects: invite?.assignedSubjects || '[]',
      },
    })

    if (invite) {
      const marked = await tx.inviteCode.updateMany({
        where: { id: invite.id, used: false },
        data: {
          used: true,
          usedBy: user.id,
          usedAt: new Date(),
        },
      })

      if (marked.count !== 1) {
        throw new Error('This invite code has already been used.')
      }
    }

    return user
  })
}

export async function completeCampusProfile(userId: string, input: CampusProfileInput) {
  const parsed = campusProfileSchema.parse(input)
  const current = await db.user.findUnique({ where: { id: userId } })
  if (!current) {
    throw new Error('Missing authenticated user.')
  }

  const role = normalizeCampusRole(current.role)
  const programme = getProgrammeByDepartmentCode(parsed.departmentCode)
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
      provider: current.provider || 'oauth',
    },
  })
}
