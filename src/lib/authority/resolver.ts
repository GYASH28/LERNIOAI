import 'server-only'

import { db } from '@/lib/db'
import { normalizeRole, permissionsForRole, type Role } from '@/lib/roles'
import {
  buildClassGroupKey,
  createAuthorityContext,
  parseAssignedSubjectIds,
  type AuthorityContext,
  type ScopedAuthorityAssignment,
} from '@/lib/authority/scope'

export interface AuthorityUserInput {
  id: string
  email: string
  name: string
  role: Role | string
  status?: string | null
  profileComplete?: boolean | null
}

export async function resolveAuthorityContext(authUser: AuthorityUserInput): Promise<AuthorityContext> {
  const user = await db.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      profileComplete: true,
      institutionId: true,
      schemeId: true,
      semesterNumber: true,
      departmentCode: true,
      division: true,
      assignedSubjects: true,
      isCR: true,
      updatedAt: true,
      memberships: {
        where: {
          status: 'verified',
          revokedAt: null,
          suspendedAt: null,
        },
        select: {
          institutionId: true,
          programmeId: true,
          schemeId: true,
          semesterId: true,
          division: true,
          status: true,
        },
      },
    },
  })

  if (!user) {
    const role = normalizeRole(authUser.role)
    return createAuthorityContext({
      user: {
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        role,
        status: authUser.status,
        profileComplete: authUser.profileComplete,
      },
      primaryRole: role,
      capabilities: permissionsForRole(role),
    })
  }

  const role = normalizeRole(user.role)
  const subjectIds = parseAssignedSubjectIds(user.assignedSubjects)
  const classGroupKey = role === 'cr' || user.isCR
    ? buildClassGroupKey({
        departmentCode: user.departmentCode,
        semesterNumber: user.semesterNumber,
        division: user.division,
      })
    : null

  const rawAssignments: ScopedAuthorityAssignment[] = [
    {
      role,
      source: 'primary-role',
      institutionId: user.institutionId,
      departmentCode: user.departmentCode,
      schemeId: user.schemeId,
      classGroupKey,
      status: 'active',
    },
    ...subjectIds.map((subjectId) => ({
      role,
      source: 'legacy-user-field' as const,
      subjectId,
      departmentCode: user.departmentCode,
      status: 'active' as const,
    })),
    ...user.memberships.map((membership) => ({
      role,
      source: 'institution-membership' as const,
      institutionId: membership.institutionId,
      programmeId: membership.programmeId,
      schemeId: membership.schemeId,
      semesterId: membership.semesterId,
      status: 'verified' as const,
    })),
  ]
  const assignments = rawAssignments.filter((assignment) => assignment.role === 'admin' || hasAnyScope(assignment))

  return createAuthorityContext({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      status: user.status,
      profileComplete: user.profileComplete,
    },
    primaryRole: role,
    capabilities: permissionsForRole(role),
    assignments,
    scopeIndex: {
      institutionIds: compact([
        user.institutionId,
        ...user.memberships.map((membership) => membership.institutionId),
      ]),
      departmentCodes: compact([user.departmentCode]),
      schemeIds: compact([user.schemeId, ...user.memberships.map((membership) => membership.schemeId)]),
      semesterIds: compact(user.memberships.map((membership) => membership.semesterId)),
      programmeIds: compact(user.memberships.map((membership) => membership.programmeId)),
      classGroupKeys: compact([classGroupKey]),
      subjectIds,
    },
    authorityVersion: user.updatedAt.getTime(),
  })
}

function hasAnyScope(assignment: ScopedAuthorityAssignment) {
  return Boolean(
    assignment.institutionId ||
      assignment.departmentCode ||
      assignment.programmeId ||
      assignment.schemeId ||
      assignment.semesterId ||
      assignment.classGroupKey ||
      assignment.subjectId,
  )
}

function compact(values: readonly (string | null | undefined)[]) {
  return values.filter((value): value is string => Boolean(value))
}
