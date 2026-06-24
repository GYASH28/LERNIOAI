# Security Model

## Trust Boundaries

- The browser never supplies authoritative `userId`, role, XP, score, correctness, streak, or permission state.
- API routes resolve the caller through `requireUser()` or role helpers.
- User-owned data queries are scoped by authenticated user ID.
- Browser-facing user objects must use `toPublicUserDTO()` or an explicit safe `select`.

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

- Password reset tokens and email verification tables/flows.
- Admin UI and server routes for role request approval/rejection.
- Stronger per-action quotas for all expensive AI/material endpoints.
- CSP/header hardening beyond the current Next.js defaults.
