# Lernio Repair Release - 2026-06-26

## Scope

This pass implemented safe production changes from the admin, performance, and intro redesign prompts without copying the demo/reference workspace:

- Public landing no longer waits on `getServerSession()` or database health. `/` is statically rendered and safe when PostgreSQL is slow or temporarily unavailable.
- Global app-only visual systems are gated away from public/auth routes. Public pages keep the small no-flash/theme runtime, while app routes keep motion, cursor, toasts, and atmosphere.
- The landing hero now uses a static-first Knowledge Core visual with optional idle/visibility animation. No WebGL or large 3D bundle blocks first paint.
- Hidden learning views are no longer preloaded on a timer after app boot. Dynamic chunks load when students actually navigate.
- Custom cursor was reduced to a medium size and native cursor overlap was fixed by hiding descendant cursors in custom-cursor mode while preserving text/select cursors.

## Authority Changes

- Added `AuthorityGrant` as an auditable parent for scoped role authority.
- Direct admin assignments and role-request approvals now use the same grant service.
- Grant creation still writes the existing resolver-backed rows:
  - `RoleAssignment`
  - `TeachingAssignment` for teacher subject grants
  - `ClassMembership` for CR class grants
- Revoking a grant-linked assignment revokes the whole grant bundle.
- Admin access UI now uses friendly institution, department, subject, and class-group selectors from `/api/admin/access/options`.
- Scope validation is covered by `src/lib/authority/grant-policy.test.ts`.

## Verification

- `npx prisma validate --schema prisma/schema.prisma`: passed
- `npm run typecheck`: passed
- `npm run test`: 19 files, 54 tests passed
- `npm run lint`: passed with existing warnings only
- `npm run build`: passed
- `npm run vercel-build`: passed; local migration/admin bootstrap skipped because local `.env` did not expose `DATABASE_URL`
- `npx playwright test public-routing.spec.ts --project=chromium`: 8 tests passed

## Local Measurement

Before this pass, the local dev landing request was measured at about `3427ms` while it could attempt session/database work.

After this pass, warmed local dev requests to `/` measured:

- `925ms`
- `784ms`
- `833ms`

Production build also shows `/` as static.
