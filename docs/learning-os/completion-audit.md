# Learning OS Completion Audit

Date: 2026-06-29

## Current Verdict

The Learning OS is not complete. The new audit package confirms the same core blockers already present in the repo reports:

- PostgreSQL is unavailable in the local environment.
- `/api/ready` is unhealthy while the database is unavailable.
- CIOT Semester 3-6 official semester placement is still missing.
- Current manifests contain 0 promoted units, topics and lessons.
- YouTube candidates are not lesson-mapped or published.
- Approved HTML/PDF lesson notes do not exist.

## Recently Remediated Locally

- Added local `docker-compose.dev.yml` for PostgreSQL.
- Added database runbook and release/remediation docs.
- Added stricter student publication predicates for schemes, subjects, units, topics and questions.
- Changed lesson default status to `draft` in Prisma.
- Added structural publication fields to units/topics.
- Added official subject display order.
- Added student/class elective selection foundation.
- Added lesson-linked quiz attempts.
- Added server-side video watch-credit calculation that rejects seek jumps and ignores client completion claims.
- Updated progress/question submission to fetch questions through the student-visible policy.
- Added approved-video fallback ranking for broken or non-embeddable primary videos.
- Added canonical lesson mode completion controls and interactive video chapter seeking.
- Added durable `LessonCompletion.lastVisited` resume tracking and a scoped semester Continue Learning card.
- Extended the curriculum importer to import optional reviewed units, topics and lessons when source-backed manifests contain them.
- Switched Playwright to the webpack dev server and kept `/theme-no-flash.js` public so E2E/a11y routes load reliably.
- Added Vercel-preview-safe demo-mode guards while keeping production demo mode blocked.
- Switched the Vercel build path to `next build --webpack`.
- Excluded `tmp/` from Vercel source uploads.
- Added explicit empty CIOT Semester 3-6 blocker manifests instead of leaving those semester slots absent.
- Updated curriculum validation so empty subject lists are valid only for draft `needs_official_source` manifests.
- Added optional subject/unit/topic/lesson scope fields for coding challenges/submissions and scoped `/api/coding` to the student's learning scope.
- Extended LEO retrieval to include student-visible approved lesson resources, video chapter snippets and approved generated note/document artifacts.

## Verification Completed Locally

- `npx prisma validate` passed.
- `npx prisma generate` passed.
- `npm run check:migrations` passed.
- `npm run curriculum:validate` passed with 12 valid manifests.
- `npm run curriculum:extract-catalog` regenerated 81 official courses and 26 unplaced CIOT courses.
- `npm run curriculum:unit-review-queue` regenerated 59 subjects, 0 ready for promotion and 27 needing manual review.
- `npm run resources:youtube:review-queue` regenerated 100 candidates and 252 draft subject mappings.
- `npm run coverage:learning` regenerated `content/reports/cwit-r23-learning-coverage.json`.
- `npm run coverage:learning` now reports 12/12 manifests present and 194 pending verification items; CIOT Semester 3-6 remain unresolved blockers, not verified curriculum.
- `npm run notes:validate` passed with 0 available note documents.
- `npm run resources:link-health -- 10` dry-run checked 10 URLs, all healthy.
- `npm run check` passed.
- `npm run build` passed.
- `npx vitest run src/lib/ai/retrieval.test.ts src/lib/ai/groq-provider.test.ts` passed.
- `npm run test:e2e` passed with 146 Playwright tests.
- `npm run test:a11y` passed.
- `npm run test:visual` passed.
- `npx vitest run src/lib/auth-policy.test.ts` passed after the Vercel preview demo-mode policy change.
- `LERNIO_DEMO_MODE=true VERCEL_ENV=preview npm run vercel-build` passed locally.
- Vercel preview branch alias `https://lernio-ai-gyash28-gyash28s-projects.vercel.app` deployed with status Ready.
- Vercel preview `/` returned 200.
- Vercel preview `/api/ready` returned 503 because database is unavailable and AI/email providers are unconfigured.

## Evidence Still Required Before Completion

- `npx prisma migrate status` against a live database.
- `npx prisma migrate deploy` against a live database.
- `npm run curriculum:import` against a live database.
- `npm run db:departments:scope -- --dry-run` against a live database.
- `/api/ready` returning 200.
- Published subject structures with official units/topics/lessons.
- Published `LessonResource` video mappings and approved note artifacts.
- Imported and reviewed curriculum-linked coding challenge mappings plus a production code runner.
- Authenticated learning E2E and accessibility tests.
- Production deployment with post-deploy smoke checks.
- Production Vercel promotion after `/api/ready` returns 200 and demo mode is disabled for production.

## External Blockers

- Docker is not installed in this Windows environment.
- PostgreSQL at `localhost:5432` is unreachable.
- GitHub CLI `gh` is not installed.
- Official CIOT Semester 3-6 semester-placement evidence has not been found in the available sources.
