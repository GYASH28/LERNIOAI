# Security Model

## Trust Boundaries

- The browser never supplies authoritative `userId`, role, XP, score, correctness, streak, or permission state.
- API routes resolve the caller through `requireUser()`, `requireActiveRole()`, or `requirePermission()`.
- Privileged reads and mutations must pass server-side capability and scope checks.
- Browser-facing user objects must use `toPublicUserDTO()` or explicit safe `select` clauses.
- Navigation visibility is not a security control.

## Public Signup

Public signup creates student access only. Elevated roles are granted through:

- the server-side admin bootstrap script
- approved role requests
- authorized scoped role assignments
- future hardened invitations

No source-code fallback grants admin access to a personal email address.

## Authority

The authority kernel in `src/lib/authority` is server-only and fail-closed.

- Active `RoleAssignment` rows grant role scope.
- Active `TeachingAssignment` rows grant teacher subject/class scope.
- Active `ClassMembership` rows grant class scope.
- Verified `InstitutionMembership` rows grant institution membership context.
- Disabled users cannot pass `requireUser()`.
- Profile fields do not grant elevated authority.
- Expired, revoked, missing, malformed, or future-dated assignments grant nothing.

## Admin Safety

Implemented controls:

- final active admin cannot be disabled, demoted, or have the final active admin assignment revoked
- admin user and assignment mutations increment `authorityVersion`
- admin mutations write `AuditEvent` records
- audit metadata is redacted for password, token, secret, API key, and database URL style fields
- admin bootstrap requires `LERNIO_ADMIN_PASSWORD` at runtime and does not commit a password

Still planned:

- recent reauthentication checks for high-risk self-actions
- typed confirmation flows for destructive UI actions
- full session revocation enforcement using `sessionsRevokedAt`
- full soft-delete/restore for all managed academic entities

## Sensitive Data

The public user DTO excludes password hashes, OAuth tokens, session tokens, invite token hashes, assigned-subject bootstrap internals, and audit internals.

Regression coverage:

- `src/lib/user-dto.test.ts`
- `src/lib/authority/audit.test.ts`

## Rate Limiting

`src/lib/rate-limit.ts` stores counters in `RateLimitBucket`. If the database is unavailable in local development, it falls back to a bounded process-local map and logs that the fallback is non-production.

Currently protected:

- credential login
- student registration
- AI tutor chat

## AI Safety

Tutor chat, text-to-speech, and speech-to-text calls go through `getAiProvider()`. Provider keys stay server-side. Tutor chat retrieves course citations from database lesson chunks and falls back safely when provider configuration is missing.

## Database Safety

Production uses Prisma migrations, not `prisma db push`. The authority migration adds new tables without deleting legacy fields. Backfill is dry-run by default and conservative.
