# Admin Operations

## Bootstrap First Admin

```powershell
$env:DATABASE_URL="postgresql://..."
$env:LERNIO_ADMIN_EMAIL="admin@example.com"
$env:LERNIO_ADMIN_PASSWORD="use-a-long-temporary-password"
npm run db:admin
Remove-Item Env:\LERNIO_ADMIN_PASSWORD
```

The bootstrap script is the only supported non-UI way to create or repair the first admin. No hardcoded email grants runtime admin access.

## Admin Workspace

Route:

- `/admin`

The page is server-rendered and requires active admin authority. It shows live counts for users, pending role requests, active role assignments, subjects, and audit events.

## Current Admin APIs

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/[id]`
- `GET /api/admin/role-requests`
- `GET /api/admin/role-assignments`
- `POST /api/admin/role-assignments`
- `DELETE /api/admin/role-assignments/[id]`
- `GET /api/admin/audit`

All routes require active admin authority server-side.

## Safety Controls

Implemented:

- final active admin protection for demotion, disable, and admin assignment revocation
- authority version increment after user/role changes
- audit events for user and role assignment mutations
- metadata redaction for secrets
- server pagination for user listing

Pending:

- typed confirmation UI for destructive actions
- recent reauthentication for high-risk self-actions
- session revocation using `sessionsRevokedAt`
- full restore flows for soft-deleted managed entities
- full institution, hierarchy, curriculum, question bank, review, and resource CRUD modules

## Role Assignment Notes

Prefer normalized assignments:

- Coordinator: `RoleAssignment` with `role="coordinator"` and department scope
- Teacher: `TeachingAssignment` for subject/class scope, optionally plus `RoleAssignment`
- Reviewer: `RoleAssignment` with subject or department scope
- Moderator: `RoleAssignment` with institution scope
- CR: `ClassMembership` or class-scoped `RoleAssignment`

Do not use profile fields as authority.
