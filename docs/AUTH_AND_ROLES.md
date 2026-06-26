# Authentication And Roles

## Student Access

Students can create their own Lernio account with name, email, and password. Public signup never accepts an elevated role.

Academic profile details are optional at signup:

- department/programme
- semester
- division
- roll number

These fields describe the student experience. They are not trusted as elevated authority.

## Google OAuth

Google sign-in is available when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured. New OAuth users are created as active students and marked as needing profile completion.

## Elevated Roles

Elevated roles:

- `cr`
- `teacher`
- `coordinator`
- `moderator`
- `reviewer`
- `admin`

Elevated access comes from server-controlled flows:

- `npm run db:admin` for the first admin or admin repair
- approved role requests
- `RoleAssignment` rows created by authorized admin APIs
- `TeachingAssignment` rows for teacher subject scope
- `ClassMembership` rows for CR/class scope

No hardcoded email grants admin authority. `ultimatebracegaming@gmail.com` can be the bootstrap email only when `LERNIO_ADMIN_EMAIL` is set and `npm run db:admin` is run with an explicit password.

## Session Freshness

NextAuth uses JWT sessions. The JWT stores `authorityVersion` and refreshes database-backed user authority on a bounded interval. Role/assignment changes increment `User.authorityVersion`; server routes still resolve fresh authority before privileged work.

## Permissions

The canonical permission matrix lives in `src/lib/roles.ts`. The scoped authority kernel lives in `src/lib/authority`.

Use:

- `requireUser()` for ordinary authenticated routes
- `requireActiveRole()` for workspace access
- `requirePermission(permission, scope)` for privileged operations

More detail:

- `docs/AUTHORITY_ARCHITECTURE.md`
- `docs/ROLE_PERMISSION_MATRIX.md`
- `docs/SECURITY_MODEL.md`

## Admin Bootstrap

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://..."
$env:LERNIO_ADMIN_EMAIL="ultimatebracegaming@gmail.com"
$env:LERNIO_ADMIN_PASSWORD="use-a-long-temporary-password"
npm run db:admin
Remove-Item Env:\LERNIO_ADMIN_PASSWORD
```

Use a temporary password, sign in, then rotate it. Do not commit real credentials.
