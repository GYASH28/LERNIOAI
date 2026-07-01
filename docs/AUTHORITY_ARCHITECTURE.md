# Authority Architecture

Lernio's authority system is server-first and fail-closed. It is built around typed capabilities, normalized role assignments, explicit scope, and audit records.

## Current State

Implemented foundations:

- typed capability registry in `src/lib/roles.ts`
- scoped authority context in `src/lib/authority/scope.ts`
- database-backed resolver in `src/lib/authority/resolver.ts`
- server role helper `requireActiveRole()`
- permission helper `requirePermission(permission, scope)`
- normalized Prisma models: `RoleAssignment`, `TeachingAssignment`, `ClassGroup`, `ClassMembership`, and `AuditEvent`
- authority session freshness through `User.authorityVersion`
- admin APIs for users, role requests, role assignments, and audit
- server-rendered workspaces for Admin, Coordinator, Teacher, Reviewer, Moderator, and CR
- conservative dry-run/write backfill script at `scripts/backfill-authority.ts`

The student product remains additive and unchanged: Dashboard, Learn, Practice, AI Tutor, Labs, Coding Lab, Exams, Revision, Materials, Planner, Analytics, and Profile remain first-class routes.

## Authority Sources

The resolver reads normalized sources first:

- active `RoleAssignment` rows
- active `TeachingAssignment` rows
- active `ClassMembership` rows
- verified `InstitutionMembership` rows

Client-editable profile fields such as `departmentCode`, `semesterNumber`, `division`, `institutionId`, and `schemeId` are not elevated authority sources. Legacy `assignedSubjects` can still be parsed by migration helpers, but it is not a trusted long-term authorization source.

## Authority Context

`resolveAuthorityContext()` returns:

- authenticated user identity
- primary role
- active role list
- capability union
- scoped assignments
- scope index
- authority version

Missing, expired, revoked, suspended, future-dated, or malformed assignments grant no capability.

## Scope Dimensions

Supported scope dimensions:

- `institutionId`
- `departmentId`
- `departmentCode`
- `programmeId`
- `schemeId`
- `semesterId`
- `classGroupId`
- `classGroupKey`
- `subjectId`
- `subjectIds`
- `resourceOwnerUserId`
- `ownOnly`

Admin authority is broad, but destructive and high-risk actions still belong in service-level invariants such as final-admin protection.

## Enforcement Points

Use:

```ts
await requireActiveRole('admin')
await requirePermission('roles.assign', { departmentCode: 'CIOT' })
```

> **Audit fix #38 (CVSS 1.5):** The previous version of this doc listed
> `requirePermission('lessons.update', ...)` and
> `requirePermission('reports.resolve', ...)` as example calls. As of the
> audit, those capability strings are **not** wired into any route handler —
> only `roles.assign` is used. The examples have been removed to avoid
> suggesting patterns that do not exist in the codebase.

Navigation hiding is not a security boundary. Every privileged route handler, server action, or server component must enforce role/capability/scope on the server.

## Fail-Closed Rules

- Teacher content operations require active subject scope.
- Coordinator operations require active department scope.
- CR tools require active class group scope.
- Reviewer queues are scoped to assigned subject/department content.
- Moderator queues return no records without institution or admin scope.
- Legacy malformed subject data grants nothing.
- Profile edits do not grant elevated scope.

## Rollout Notes

Run the backfill in dry-run mode first:

```bash
npm run db:authority:backfill
```

After reviewing the output:

```bash
npm run db:authority:backfill -- --write
```

The backfill is conservative and idempotent. Ambiguous rows are reported rather than upgraded to broad authority.
