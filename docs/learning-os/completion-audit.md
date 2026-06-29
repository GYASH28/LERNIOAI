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
- Added lesson-level Materials filtering through scoped, approved `LessonResource` mappings.
- Aligned proxy and Next fallback CSP through a shared restrictive policy helper with nonce support and explicit YouTube/storage allowlists.
- Added lesson-backed planner tasks with server-derived canonical Learn links and source recommendation reasons.
- Added source lesson return links to revision due items and flashcards.
- Added authority-scoped Learning OS preview access for teacher/coordinator/reviewer/admin coverage, catalog, unit, YouTube candidate, notes and resource-review surfaces.
- Added lesson-scoped quiz-attempt selection and stored lesson-scope provenance so quiz completion evidence cannot be satisfied by a broad subject quiz.
- Added curriculum-aware Labs integration, scoping labs to the student's active subjects, checking publication safety, and listing official experiments or structured blocker information.
- Added trusted Coding Lab runner integration: submissions execute only through a configured remote runner, runner responses are validated before any pass/XP, expected test values stay server-side, and unconfigured runner paths save submissions for manual review without XP.
- Added an authority-scoped lesson-resource mapping workflow in the resource review queue with governed roles, same-subject validation, reviewer evidence requirements, audited draft/approve actions and primary-video demotion.
- Added a lesson-note generation worker boundary and audited queue API: scoped reviewers/admins can queue jobs for published/verified lessons, workers claim/lease/retry jobs, generated documents are validated against lesson identity and approved source IDs, HTML artifacts are written through configured storage, and AI output stops at `ready_for_review` until reviewer publication.
- Added controlled generated-note delivery: lesson studio now links to `/api/learning/notes/[documentId]`, which checks the student's learning scope and generated-document publication policy before redirecting to signed HTML/PDF artifacts; raw storage object keys are not rendered into lesson pages.
- Added database-backed published coverage reporting: `coverage:learning` can attach a live `--with-db` snapshot of student-visible subjects, units, topics, lessons, primary videos, approved HTML/PDF notes, practice coverage, resources, questions, labs, coding challenges and pending review items; `--require-db` turns that into a hard release gate, and the admin coverage page scope-filters the attached database snapshot.
- Added guarded YouTube candidate promotion: reviewed candidate decisions can be dry-run or written through `scripts/promote-youtube-candidate-mappings.ts` or `POST /api/admin/resources/youtube-candidates/promote`, creating governed `Resource` and `LessonResource` rows only when the candidate is ready for lesson mapping, the lesson belongs to the reviewed subject, and approvals have verified direct-video metadata plus reviewer evidence.

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
- `npx vitest run src/lib/security/content-security-policy.test.ts` passed.
- `npx vitest run src/features/learning/server/get-student-learning-scope.test.ts` passed.
- `npx vitest run src/lib/learning/learning-ops-authority.test.ts src/lib/resources/resource-governance.test.ts` passed.
- `npx vitest run src/features/learning/server/lesson-completion-policy.test.ts` passed.
- `npx vitest run src/app/api/labs/route.test.ts` passed.
- `npx vitest run src/lib/coding/code-runner.test.ts` passed.
- `npx vitest run src/lib/resources/resource-governance.test.ts` passed.
- `npx vitest run src/lib/lesson-notes/generation-worker.test.ts src/app/api/admin/learning/notes/jobs/route.test.ts` passed.
- `npx vitest run src/lib/storage/signed-object-url.test.ts src/app/api/learning/notes/[documentId]/route.test.ts` passed.
- `npx vitest run src/lib/curriculum/coverage-report.test.ts src/lib/curriculum/database-coverage-report.test.ts` passed.
- `npx vitest run src/lib/resources/youtube-candidate-promotion.test.ts src/lib/resources/youtube-candidate-review.test.ts src/lib/resources/resource-governance.test.ts` passed.
- `npm run check` passed with 52 test files / 187 tests.
- `npm run build` passed with 93 static pages.
- `npx tsx scripts/build-learning-coverage-report.ts --with-db` exercised the database-backed coverage path and reported database coverage unavailable because local PostgreSQL is unreachable.
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
- Configured lesson-note generator and artifact-storage services plus reviewer approval/publication of generated notes.
- Imported and reviewed curriculum-linked coding challenge mappings plus configured production code-runner service credentials.
- Reviewed YouTube candidate lesson-mapping decision files, followed by a live dry-run/write against PostgreSQL.
- `npx tsx scripts/build-learning-coverage-report.ts --require-db` against a reachable PostgreSQL database.
- Authenticated learning E2E and accessibility tests.
- Production deployment with post-deploy smoke checks.
- Production Vercel promotion after `/api/ready` returns 200 and demo mode is disabled for production.

## External Blockers

- Docker is not installed in this Windows environment.
- PostgreSQL at `localhost:5432` is unreachable, so live database-backed coverage cannot be produced locally.
- GitHub CLI `gh` is not installed.
- Official CIOT Semester 3-6 semester-placement evidence has not been found in the available sources.
