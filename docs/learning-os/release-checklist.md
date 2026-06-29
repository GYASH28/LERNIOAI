# Learning OS Release Checklist

Date: 2026-06-29

## Required Gates

- PostgreSQL is reachable.
- `npx prisma migrate status` passes.
- `npx prisma migrate deploy` passes.
- `/api/health` returns 200.
- `/api/ready` returns 200.
- Only COMP/DCOMP and CIOT/DCIOT are selectable for this deployment.
- CIOT Semester 3-6 status is either officially verified or explicitly blocked.
- No normal-student route exposes draft/unreviewed curriculum, questions, resources or generated documents.
- Learning coverage gaps are regenerated and reported honestly.

## Command Matrix

```bash
npm ci
npx prisma generate
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
npm run db:departments:scope -- --dry-run
npm run curriculum:validate
npm run curriculum:import
npm run coverage:learning
npm run resources:youtube:candidates
npm run resources:youtube:verify
npm run resources:youtube:review-queue
npm run resources:link-health
npm run notes:validate
npm run notes:render-pdf
npm run check
npm run build
npm run test:e2e
npm run test:a11y
npm run test:visual
```

## Vercel Deployment Order

1. Confirm `.vercel/project.json` points at the intended `lernio-ai` project.
2. Confirm production environment variables are configured in Vercel.
3. Backup database.
4. Run migrations.
5. Deploy preview.
6. Run smoke tests against preview.
7. Promote or deploy production only when readiness is healthy.
8. Scan logs for post-deploy errors.

## Rollback

1. If build fails, do not promote.
2. If readiness fails after deployment, roll back to previous production deployment.
3. Restore database only when a migration/data issue is confirmed and a backup is available.
4. Re-run `/api/health`, `/api/ready`, sign-in, canonical Learn route and admin coverage checks.

## Current Release Status

Blocked. Local PostgreSQL is unavailable, `/api/ready` is unhealthy, `npx prisma migrate status`, `npm run curriculum:import`, and `npm run db:departments:scope` cannot run against `localhost:5432`. Curriculum coverage still has zero published units/topics/lessons/resources, 0 unit candidates ready for promotion, and CIOT Semester 3-6 placement remains unverified.

The non-database gates passed locally on 2026-06-29: `npx prisma validate`, `npx prisma generate`, `npm run check:migrations`, `npm run curriculum:validate`, `npm run coverage:learning`, `npm run check`, `npm run build`, `npm run test:e2e`, `npm run test:a11y`, and `npm run test:visual`.
