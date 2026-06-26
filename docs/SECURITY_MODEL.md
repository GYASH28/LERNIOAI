# Security Model

## Trust Boundaries

- The browser never supplies authoritative `userId`, role, XP, score, correctness, streak, or permission state.
- API routes resolve the caller through `requireUser()` or role helpers.
- Privileged routes should use `requirePermission()` with an explicit scope.
- User-owned data queries are scoped by authenticated user ID.
- Browser-facing user objects must use `toPublicUserDTO()` or an explicit safe `select`.

## Role Authority

The authority kernel in `src/lib/authority` is server-only and fail-closed.

- Missing teacher subject scope denies subject mutation.
- Missing coordinator department scope denies department authority.
- Malformed legacy `assignedSubjects` JSON grants no authority.
- Moderator and reviewer capabilities are separated.
- Admin broad authority still requires service-level invariants for destructive actions.

## Sensitive Data

The public user DTO excludes password hashes, OAuth tokens, session tokens, invite token hashes, assigned-subject bootstrap internals, and assignment audit metadata.

Regression coverage:

- `src/lib/user-dto.test.ts`

## Rate Limiting

`src/lib/rate-limit.ts` stores counters in the `RateLimitBucket` database table. If the database is unavailable in local development, it falls back to a bounded process-local map and logs that the fallback is non-production.

Currently protected:

- credential login
- student registration
- AI tutor chat

## AI Safety

Tutor chat, text-to-speech, and speech-to-text calls go through `getAiProvider()`. The chat route builds retrieved course citations from database lesson chunks, while the provider handles system-role prompting, timeout fallback, and safe provider error responses.

## Remaining Work

- Normalized role assignment, teaching assignment, class group, and audit event migrations.
- Admin UI and server routes for full user/access/curriculum management.
- Stronger per-action quotas for all expensive AI/material endpoints.
- CSP/header hardening beyond the current Next.js defaults.
