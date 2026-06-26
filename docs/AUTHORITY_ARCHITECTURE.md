# Authority Architecture

Lernio now has a typed authority kernel under `src/lib/authority`.

## Current Phase

This is Phase 1 of the role-authority transformation:

- typed capability registry in `src/lib/roles.ts`
- scoped authority context in `src/lib/authority/scope.ts`
- database-backed authority resolver in `src/lib/authority/resolver.ts`
- `requirePermission()` wired through the new kernel
- fail-closed handling for missing or malformed legacy scope fields

The student product remains unchanged. Existing student routes, LEO, Groq provider behavior, progress, XP, study tools, and learning views are preserved.

## Authority Context

The resolver builds an `AuthorityContext` containing:

- authenticated user identity
- primary role
- active role list
- capability list
- scoped assignments
- scope index
- authority version

Until normalized assignment tables are added, the resolver uses existing data conservatively:

- `User.assignedSubjects` is parsed only when it is a valid JSON string array
- malformed `assignedSubjects` grants no subject scope
- `User.departmentCode` grants only that department scope
- CR class scope is derived only when department, semester, and division are complete
- verified `InstitutionMembership` rows contribute institution/programme/scheme/semester scope

## Fail-Closed Rules

The authority kernel denies by default:

- teacher content mutation without a matching subject
- coordinator authority without a matching department
- CR class tools without a complete class scope
- reviewer/moderator actions outside their capability family
- disabled users
- malformed legacy scope data

Admins currently retain broad authority through the primary role. Final-admin protection and destructive-action invariants must live in service-layer mutations before admin write APIs are expanded.

## Enforcement Points

Use `requirePermission(permission, scope)` for route handlers and server actions.

Examples:

```ts
await requirePermission('roles.assign', { departmentCode: 'CIOT' })
await requirePermission('lessons.update', { subjectId: 'subject_123' })
await requirePermission('reports.resolve', { institutionId: 'inst_123' })
```

Hidden navigation is not a security boundary. Menus can use the same registry for UX, but every read and mutation must enforce authority on the server.

## Next Migration Phase

The next schema phase should add:

- `RoleAssignment`
- `TeachingAssignment`
- `ClassGroup`
- `ClassMembership`
- general `AuditEvent`
- session/authority version fields

Backfill must be dry-run capable and conservative. Ambiguous legacy rows should be reported, not upgraded to broad authority.
