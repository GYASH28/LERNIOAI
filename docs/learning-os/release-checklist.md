# Learning OS Release Checklist

Date: 2026-06-29

## Required Gates

- PostgreSQL is reachable.
- `npx prisma migrate status` passes.
- `npx prisma migrate deploy` passes.
- `/api/health` returns 200.
- `/api/ready` returns 200.
- Coding Lab production runner environment is configured if automated coding passes/XP are enabled (`CODE_RUNNER_URL` plus token or HMAC secret).
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
npm run content:import:youtube-guides -- --sem12 content-import/CWIT_Semester_1_2_YouTube_Lecture_Links.pdf --sem36 content-import/CWIT_Semester_3_to_6_YouTube_Lecture_Links.pdf --dry-run
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
2. Confirm production environment variables are configured in Vercel, including code-runner credentials when Coding Lab scoring is enabled.
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

Blocked. Local PostgreSQL is unavailable, `/api/ready` is unhealthy, `npx prisma migrate status`, `npm run curriculum:import`, and `npm run db:departments:scope` cannot run against `localhost:5432`. Curriculum coverage still has zero published units/topics/lessons/resources and 0 unit candidates ready for promotion. CIOT Semester 3-6 now have explicit empty draft blocker manifests, but placement remains unverified and no subjects may be added until official semester-placement evidence is obtained.

Vercel preview deployment is live, but not production-promotable:

- Preview branch alias: `https://lernio-ai-gyash28-gyash28s-projects.vercel.app`
- Status: Ready
- `/` smoke check: 200
- `/api/ready`: 503 with `database: unavailable`, `auth: configured`, `ai: unconfigured`, and `email: unconfigured`

The non-database gates passed locally on 2026-06-29: `npx prisma validate`, `npx prisma generate`, `npm run check:migrations`, `npm run curriculum:validate` with 12 manifests, `npm run coverage:learning` with 12/12 manifests present and 194 pending verification items, `npm run check` (46 test files / 166 tests passed), `npm run build` (91 static pages), `npm run test:e2e` (146 Playwright tests passed), `npm run test:a11y`, and `npm run test:visual`. Including labs route, trusted coding-runner, and lesson-resource mapping unit tests.
