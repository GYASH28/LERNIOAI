import 'server-only'

import { db } from '@/lib/db'
import { normalizeRole, permissionsForRole, type Permission, type Role } from '@/lib/roles'
import { createAuthorityContext, type AuthorityContext, type ScopedAuthorityAssignment } from '@/lib/authority/scope'

export interface AuthorityUserInput {
  id: string
  email: string
  name: string
  role: Role | string
  status?: string | null
  profileComplete?: boolean | null
  authorityVersion?: number | null
}

export async function resolveAuthorityContext(authUser: AuthorityUserInput): Promise<AuthorityContext> {
  const now = new Date()
  const user = await db.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      profileComplete: true,
      authorityVersion: true,
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
        },
      },
      roleAssignments: {
        where: {
          status: 'active',
          revokedAt: null,
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: {
          role: true,
          institutionId: true,
          departmentId: true,
          departmentCode: true,
          programmeId: true,
          schemeId: true,
          semesterId: true,
          classGroupId: true,
          subjectId: true,
        },
      },
      teachingAssignments: {
        where: {
          status: 'active',
          revokedAt: null,
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: {
          subjectId: true,
          classGroupId: true,
          institutionId: true,
          departmentId: true,
        },
      },
      classMemberships: {
        where: {
          status: 'active',
          leftAt: null,
        },
        select: {
          role: true,
          classGroupId: true,
          classGroup: {
            select: {
              institutionId: true,
              departmentId: true,
              programmeId: true,
              schemeId: true,
              semesterId: true,
              code: true,
            },
          },
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
      authorityVersion: authUser.authorityVersion ?? 0,
    })
  }

  const role = normalizeRole(user.role)
  const roleAssignmentRoles = user.roleAssignments.map((assignment) => normalizeRole(assignment.role))
  const classMembershipRoles = user.classMemberships.map((membership) =>
    normalizeRole(membership.role) === 'cr' ? 'cr' : 'student',
  )
  const activeRoles = uniqueRoles([role, ...roleAssignmentRoles, ...classMembershipRoles])
  const capabilities = uniquePermissions(activeRoles.flatMap((activeRole) => permissionsForRole(activeRole)))
  const rawAssignments: ScopedAuthorityAssignment[] = [
    {
      role,
      source: 'primary-role',
      status: 'active',
    },
    ...user.roleAssignments.map((assignment) => ({
      role: normalizeRole(assignment.role),
      source: 'role-assignment' as const,
      institutionId: assignment.institutionId,
      departmentId: assignment.departmentId,
      departmentCode: assignment.departmentCode,
      programmeId: assignment.programmeId,
      schemeId: assignment.schemeId,
      semesterId: assignment.semesterId,
      classGroupId: assignment.classGroupId,
      subjectId: assignment.subjectId,
      status: 'active' as const,
    })),
    ...user.teachingAssignments.map((assignment) => ({
      role: 'teacher' as const,
      source: 'teaching-assignment' as const,
      institutionId: assignment.institutionId,
      departmentId: assignment.departmentId,
      classGroupId: assignment.classGroupId,
      subjectId: assignment.subjectId,
      status: 'active' as const,
    })),
    ...user.classMemberships.map((membership) => ({
      role: normalizeRole(membership.role) === 'cr' ? ('cr' as const) : ('student' as const),
      source: 'class-membership' as const,
      institutionId: membership.classGroup.institutionId,
      departmentId: membership.classGroup.departmentId,
      programmeId: membership.classGroup.programmeId,
      schemeId: membership.classGroup.schemeId,
      semesterId: membership.classGroup.semesterId,
      classGroupId: membership.classGroupId,
      classGroupKey: membership.classGroup.code,
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
    activeRoles,
    capabilities,
    assignments,
    scopeIndex: {
      institutionIds: compact([
        ...user.roleAssignments.map((assignment) => assignment.institutionId),
        ...user.teachingAssignments.map((assignment) => assignment.institutionId),
        ...user.classMemberships.map((membership) => membership.classGroup.institutionId),
        ...user.memberships.map((membership) => membership.institutionId),
      ]),
      departmentIds: compact([
        ...user.roleAssignments.map((assignment) => assignment.departmentId),
        ...user.teachingAssignments.map((assignment) => assignment.departmentId),
        ...user.classMemberships.map((membership) => membership.classGroup.departmentId),
      ]),
      departmentCodes: compact(user.roleAssignments.map((assignment) => assignment.departmentCode)),
      schemeIds: compact([
        ...user.roleAssignments.map((assignment) => assignment.schemeId),
        ...user.classMemberships.map((membership) => membership.classGroup.schemeId),
        ...user.memberships.map((membership) => membership.schemeId),
      ]),
      semesterIds: compact([
        ...user.roleAssignments.map((assignment) => assignment.semesterId),
        ...user.classMemberships.map((membership) => membership.classGroup.semesterId),
        ...user.memberships.map((membership) => membership.semesterId),
      ]),
      programmeIds: compact([
        ...user.roleAssignments.map((assignment) => assignment.programmeId),
        ...user.classMemberships.map((membership) => membership.classGroup.programmeId),
        ...user.memberships.map((membership) => membership.programmeId),
      ]),
      classGroupIds: compact([
        ...user.roleAssignments.map((assignment) => assignment.classGroupId),
        ...user.teachingAssignments.map((assignment) => assignment.classGroupId),
        ...user.classMemberships.map((membership) => membership.classGroupId),
      ]),
      classGroupKeys: compact(user.classMemberships.map((membership) => membership.classGroup.code)),
      subjectIds: compact([
        ...user.roleAssignments.map((assignment) => assignment.subjectId),
        ...user.teachingAssignments.map((assignment) => assignment.subjectId),
      ]),
    },
    authorityVersion: user.authorityVersion,
  })
}

function hasAnyScope(assignment: ScopedAuthorityAssignment) {
  return Boolean(
    assignment.institutionId ||
      assignment.departmentId ||
      assignment.departmentCode ||
      assignment.programmeId ||
      assignment.schemeId ||
      assignment.semesterId ||
      assignment.classGroupId ||
      assignment.classGroupKey ||
      assignment.subjectId,
  )
}

function compact(values: readonly (string | null | undefined)[]) {
  return values.filter((value): value is string => Boolean(value))
}

function uniqueRoles(values: readonly Role[]) {
  return Array.from(new Set(values))
}

function uniquePermissions(values: readonly Permission[]) {
  return Array.from(new Set(values))
}
