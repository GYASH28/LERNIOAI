# Authority Migration And Backfill

## Migration

Migration:

- `prisma/migrations/20260626103000_add_authority_tables/migration.sql`

New or changed data structures:

- `User.authorityVersion`
- `User.lastReauthenticatedAt`
- `User.sessionsRevokedAt`
- `RoleAssignment`
- `TeachingAssignment`
- `ClassGroup`
- `ClassMembership`
- `AuditEvent`

The migration is additive. It does not remove legacy fields such as `User.role`, `User.assignedSubjects`, `departmentCode`, `semesterNumber`, or `division`.

## Backfill Script

Script:

```bash
npm run db:authority:backfill
```

Default mode is dry-run. It prints inventory and intended changes without writing.

Write mode:

```bash
npm run db:authority:backfill -- --write
```

## What It Backfills

The script is conservative and idempotent:

- creates missing `InstitutionMembership` rows from valid user/institution context
- creates `ClassGroup` rows from complete department, semester, and division context
- creates `ClassMembership` rows for users with complete class context
- maps legacy CR state to class-scoped authority when class context is complete
- creates `RoleAssignment` rows for unambiguous elevated roles
- creates `TeachingAssignment` rows from valid legacy assigned subject IDs
- writes `AuditEvent` records for generated authority rows
- increments `authorityVersion` when authority is written

## What It Does Not Do

- It does not grant global authority because data is incomplete.
- It does not trust malformed `assignedSubjects`.
- It does not overwrite existing normalized assignments.
- It does not delete legacy fields.
- It does not reset the database.

## Rollout Steps

1. Backup the database.
2. Deploy migration with `npm run db:deploy`.
3. Run dry-run backfill.
4. Review ambiguous rows.
5. Fix source data or create explicit assignments manually.
6. Run write backfill.
7. Log in as admin and verify `/admin`, `/teacher`, `/coordinator`, `/reviewer`, `/moderator`, and `/cr` as applicable.

## Rollback

The migration is additive, so code can ignore the new tables if needed. Database rollback should use a real backup. Do not drop authority tables in production unless a restore plan has been tested.
