# Learning OS Phase Progress Report

Date: 2026-06-28

## Phase 0 Audit

### Inspected

- Repository architecture, Prisma schema, migrations, scripts, tests and README.
- Student routes and views, including dashboard and Learn.
- Bootstrap and `/api/academics` data flow.
- Department/programme selectors and registration flows.
- Resource governance, syllabus source registry, LEO retrieval, progress and materials APIs.
- Supplied prompt, two YouTube PDFs and pasted research text.

### Added

- `docs/learning-os/current-state-audit.md`
- `docs/learning-os/target-architecture.md`
- `docs/learning-os/route-and-component-map.md`
- `docs/learning-os/curriculum-coverage-matrix.md`
- `docs/learning-os/resource-and-content-provenance.md`
- `docs/learning-os/data-migration-plan.md`
- `docs/learning-os/testing-and-release-plan.md`

## Phase 1 Progress: Programme Scope

### Changed

- Added target programme constants and helpers in `src/lib/cwit-departments.ts`.
- Kept `CWIT_ALL_DEPARTMENTS` for archival/admin scripts.
- Changed student-facing `CWIT_DEPARTMENTS`/`CWIT_PROGRAMMES` to expose only:
  - COMP / DCOMP
  - CIOT / DCIOT
- Updated `scripts/upsert-cwit-departments.ts` so routine upserts do not reactivate non-target departments.
- Added `scripts/scope-cwit-programmes.ts` with `--dry-run` and `--write` modes.
- Added `npm run db:departments:scope`.
- Enforced the same target allowlist in `/api/auth/register` and `resolveProgrammeFromDatabase()`.

### Data/Sources

- Added official CWIT R23 CP/CI curriculum and structure URLs to `data/cwit/source-registry.json`.
- Copied supplied implementation inputs into `content-import/`.

### Verification

- `npm run test -- src/lib/campus-auth.test.ts`: passed, 4 tests.
- `npm run typecheck`: passed.
- Touched-file ESLint: passed.
- `npm run lint`: passed with 137 existing warnings, 0 errors.
- `npm run check:migrations`: passed.
- `npm run test`: passed, 19 files, 59 tests.
- `npx prisma validate`: passed.

### Dry Run

- `npm run db:departments:scope -- --dry-run` did not mutate data, but could not complete because the configured database timed out before the first query.
- Error class: `PrismaClientInitializationError`, connection pool timeout.

## Phase 2 Progress: Student Learning Scope

### Changed

- Added server-only `getStudentLearningScope(userId)` in `src/features/learning/server/get-student-learning-scope.ts`.
- The scope resolves:
  - target department/programme;
  - active non-archived scheme;
  - current semester;
  - optional class group;
  - scoped subjects with units, topics and published/verified lessons.
- `src/lib/app-bootstrap.ts` now uses the scope service instead of loading all subjects.
- `/api/academics` now returns authenticated user-scoped subjects and returns an empty private payload for unauthenticated callers.
- Added reusable predicates/query builders for scoped subjects, lessons, resources, units and topics.
- `GET /api/materials` now returns only verified, clear, current-scope public/published resources.
- `POST /api/materials` now rejects out-of-scope subject, unit and topic IDs before accepting a contribution.
- `GET /api/progress/lesson` now returns only completions for accessible lessons.
- `POST /api/progress/lesson` now rejects inaccessible lesson IDs before writing progress or awarding XP.
- `POST /api/tutor/session` now rejects out-of-scope subject/unit/topic context.
- `POST /api/tutor/chat` now validates the stored tutor session context against the current learning scope.
- LEO retrieval now accepts `allowedSubjectIds` and will not text-match lessons outside the student's scoped subjects.
- Added topic-level learning-scope predicates and Prisma query builders.
- `GET /api/questions` now returns only questions from the student's scoped subjects/topics.
- `POST /api/progress` now rejects out-of-scope questions and prevents topic spoofing on mastery writes.
- `GET /api/progress` now scopes mastery, lesson completions, question attempts, quiz attempts and study sessions.
- Revision due and flashcard APIs now filter schedules by scoped topics and reject out-of-scope review submissions.
- Exam paper, quiz submission, attempt creation, resume, autosave, submit and answer-evaluation APIs now enforce scoped subject/question access.
- Planner task CRUD validates scoped subject/topic references, hides out-of-scope tasks and preserves unrelated future tasks during scoped deletes.
- Auto-planner generation now uses scoped weak topics and scoped revision schedules.
- Analytics activity, calendar, focus, readiness, readiness radar, daily quests and quest-claim checks now aggregate only scoped learning activity where the underlying rows carry subject/topic links.
- Command palette inspection found static navigation/actions only; no curriculum search API is exposed there.
- Coding challenges now have optional subject/unit/topic/lesson fields and `/api/coding` filters linked challenges through the student's learning scope; imported reviewed mappings remain pending, and runner execution is gated by trusted runner service configuration.

### Additional Verification

- `npm run typecheck`: passed.
- `npm run test -- src/features/learning/server/get-student-learning-scope.test.ts src/lib/campus-auth.test.ts`: passed, 2 files, 7 tests.
- Touched-file ESLint for learning scope, materials, progress, tutor session/chat and retrieval: passed.
- `npm run test -- src/features/learning/server/get-student-learning-scope.test.ts src/lib/resources/lesson-resource-policy.test.ts src/lib/campus-auth.test.ts`: passed, 3 files, 14 tests.
- Touched-route ESLint for questions, progress, revision, exams, planner, analytics and learning scope: passed.
- `npx prisma validate`: passed.
- `npm run check:migrations`: passed.
- `npm run test`: passed, 21 files, 69 tests.

## Phase 3 Progress: Lesson Studio Data Model

### Changed

- Added `LessonResource` as the explicit ordered relationship between lessons and resources.
- Added `VideoChapter` for timestamped video segments tied to governed video resources.
- Added `VideoWatchProgress` for user-level video progress that can feed cross-device continue-learning state.
- Added `GeneratedLessonDocument` for AI-assisted notes and other generated learning documents with source provenance, reviewer/publisher fields and artifact storage keys.
- Added `ContentGenerationJob` for queued/retryable content-generation workflow state.
- Added `LessonCompletionCriteria` for per-lesson completion policy.
- Added relation fields on `Lesson`, `Resource` and `User` for the new models.
- Added migration `prisma/migrations/20260628172000_add_lesson_resource_studio/migration.sql`.
- Added `src/lib/resources/lesson-resource-policy.ts` for governed resource roles and YouTube URL canonicalization.
- Added tests for lesson resource roles and YouTube URL shapes found in the supplied PDFs.

### Additional Verification

- `npx prisma validate`: passed.
- `npm run check:migrations`: passed.
- `npm run test -- src/lib/resources/lesson-resource-policy.test.ts src/features/learning/server/get-student-learning-scope.test.ts src/lib/campus-auth.test.ts`: passed, 3 files, 13 tests.
- Touched-file ESLint for lesson-resource policy and learning scope: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 21 files, 68 tests.

## Phase 4 Progress: Curriculum and Resource Manifests

### Changed

- Downloaded the four official CWIT R23 PDFs into `content-import/official/`.
- Extracted official PDF text into `tmp/pdfs/official/` for evidence review.
- Added `content/curriculum/cwit-r23/schemas/curriculum.schema.json`.
- Added structure-verified Semester 1-2 curriculum manifests for COMP and CIOT.
- Added review-only unit/outcome extraction report generation with `npm run curriculum:extract-units`.
- Added `src/lib/curriculum/manifest-validation.ts` and tests.
- Added `scripts/validate-curriculum-manifests.ts` and `npm run curriculum:validate`.
- Added non-publishing `scripts/import-curriculum-manifests.ts` and `npm run curriculum:import`.
- Officially corrected Semester 2 BEEE coverage: COMP has `R23CP1301`; CIOT has `R23CI1301`.
- Added `scripts/build-youtube-candidates.ts` and `npm run resources:youtube:candidates`.
- Generated `content/resources/youtube-candidates/cwit-r23-youtube-candidates.json` with 100 draft YouTube candidates and 3 skipped non-YouTube URLs.
- Added `scripts/verify-youtube-candidates.ts` and `npm run resources:youtube:verify`.
- Generated `content/resources/youtube-candidates/cwit-r23-youtube-candidates.metadata.json` with 100 oEmbed metadata checks.
- Metadata check result: 6 direct video candidates returned public oEmbed metadata; 94 playlist candidates remain manual/API-review-only.
- Added `scripts/build-youtube-candidate-review-queue.ts` and `npm run resources:youtube:review-queue`.
- Generated `content/resources/youtube-candidates/cwit-r23-youtube-candidate-review-queue.json` as a draft-only reviewer queue.
- Review queue result: 100 metadata-checked candidates, 252 subject mappings, 0 ready for lesson mapping, 65 blocked by unplaced official subjects, 18 blocked by missing manifest subjects and 169 blocked by missing verified lesson structure.

### Additional Verification

- `npm run curriculum:validate`: passed, 4 manifests.
- `npm run curriculum:extract-units`: passed, 28 subject reports.
- `npm run resources:youtube:candidates`: passed, 100 candidates.
- `npm run resources:youtube:verify -- 5`: passed, 5-candidate dry run.
- `npx tsx scripts/verify-youtube-candidates.ts --write`: passed, 100 metadata checks.
- `npm run test -- src/lib/curriculum/manifest-validation.test.ts src/lib/resources/lesson-resource-policy.test.ts src/features/learning/server/get-student-learning-scope.test.ts`: passed, 3 files, 12 tests.
- Script/curriculum ESLint: passed.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npm run check:migrations`: passed.
- `npm run test`: passed, 22 files, 71 tests.
- `npm run curriculum:import`: dry-run attempted no writes, but could not reach PostgreSQL due connection pool timeout.

## Phase 5 Progress: Route-Aware Learn Foundation

### Changed

- Added `src/features/learning/server/get-semester-overview.ts`.
- Added `/learn/[programmeCode]/semester/[semesterNumber]` as a server-rendered, access-checked semester overview route.
- Added `src/features/learning/server/get-subject-overview.ts`.
- Added `/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]` as a server-rendered, access-checked subject overview route.
- Semester subject rows link to the canonical subject route.
- Added `src/features/learning/server/get-unit-overview.ts`.
- Added `/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/unit/[unitNumber]` as a server-rendered, access-checked unit route.
- Unit routes now list published lessons and link to canonical lesson URLs.
- Added `src/features/learning/utils/lesson-slugs.ts` for readable lesson slugs with stable id suffixes.
- Added `src/features/learning/server/get-lesson-studio.ts`.
- Added `/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/lesson/[lessonSlug]` as a server-rendered, access-checked lesson studio foundation.
- Lesson studio loads only the signed-in student's current scoped programme/semester/subject lesson, approved lesson resources, approved generated documents, video chapters, watch progress, completion criteria and five-mode completion state.
- Added `src/app/api/progress/video/route.ts` for scoped video resume/progress writes against approved lesson video resources.
- Added `src/features/learning/components/lesson/lesson-video-player.tsx` to resume YouTube playback and persist watch progress through the scoped API.
- Added `src/features/learning/server/lesson-completion-policy.ts` and enforced active `LessonCompletionCriteria` in `/api/progress/lesson` before completion XP can be awarded.
- Extended LEO retrieval and `/api/tutor/chat` to accept an optional lesson id, validate it against the current scope/session context and prioritize exact lesson grounding.
- Updated the Tutor client to initialize subject/unit/topic/lesson context from lesson-studio query parameters.
- Added `src/features/learning/utils/canonical-learning-routes.ts` so dashboard and utility-bar actions can route to canonical semester, subject and lesson URLs.
- Dashboard Continue Learning, Start Learning and subject cards now prefer canonical Learn routes with the legacy client context as fallback.
- The top student utility bar Resume/Start action now prefers canonical Learn routes.
- Semester and subject overview counts now include both unit-level and topic-level published lessons.
- `/learn` now resolves a signed-in student's scope and redirects to their current canonical semester route.
- The legacy `/learn` client shell remains as the fallback for unresolved scope, demo and database-unavailable cases.

### Additional Verification

- `npm run typecheck`: passed.
- Targeted ESLint for the new routes and server overview services: passed.
- `npm run test -- src/features/learning/utils/lesson-slugs.test.ts src/features/learning/server/get-student-learning-scope.test.ts`: passed, 2 files, 8 tests.
- `npx prisma generate`: passed.
- Targeted ESLint for `/learn`, canonical Learn routes, lesson studio loader, overview services and slug utilities: passed.
- Targeted ESLint for video progress API, progress schema and lesson video player: passed.
- `npm run test -- src/features/learning/server/lesson-completion-policy.test.ts`: passed, 1 file, 3 tests.
- Targeted ESLint for lesson completion policy and `/api/progress/lesson`: passed.
- Targeted ESLint for Tutor client, Tutor chat route, LEO retrieval and lesson studio LEO link: passed.
- `npm run test -- src/features/learning/utils/canonical-learning-routes.test.ts src/features/learning/utils/lesson-slugs.test.ts`: passed, 2 files, 8 tests.

## Phase 6 Progress: Lesson Notes Contract

### Changed

- Added `src/lib/lesson-notes/lesson-note-document.ts` with the Zod contract for generated lesson notes.
- Added deterministic, escaped, print-safe HTML rendering via `renderLessonNoteHtml()`.
- Added `scripts/validate-lesson-note-documents.ts` and `npm run notes:validate`.
- Added unit tests for note document validation, unresolved citations and HTML escaping.

### Additional Verification

- `npm run test -- src/lib/lesson-notes/lesson-note-document.test.ts`: passed, 1 file, 3 tests.
- `npm run notes:validate`: passed, 0 documents currently present.
- Targeted ESLint for lesson-note schema/renderer, tests and validation script: passed.
- `npm run typecheck`: passed.

## Phase 7 Progress: Scoped Search and Coverage Reporting

### Changed

- Added `src/features/learning/utils/learning-search.ts` for scoped curriculum/resource search result ranking and canonical href generation.
- Added `/api/search/learning` as an authenticated, private/no-store search API for current-scope semester, subjects, units, topics, published lessons and approved resources.
- Updated the command palette to include server-scoped Learning results while preserving static navigation, action and appearance commands.
- Added topic anchors on canonical unit pages so topic search results can route to the parent unit.
- Added `src/lib/curriculum/coverage-report.ts` and `scripts/build-learning-coverage-report.ts`.
- Added `npm run coverage:learning`.
- Generated `content/reports/cwit-r23-learning-coverage.json`.
- Added `src/lib/resources/link-health.ts` and `scripts/check-resource-link-health.ts`.
- Added `npm run resources:link-health`.
- Generated `content/reports/cwit-r23-link-health.json`.
- Added `/admin/learning/coverage` for a read-only admin coverage dashboard.
- Added `/admin/learning/notes`, `/admin/learning/notes/[noteSlug]` and `/admin/learning/notes/[noteSlug]/print` for validated note preview and print-safe HTML handoff.
- Added Learning Coverage and Lesson Notes to the admin navigation and admin dashboard quick actions.
- Extended the Materials Library UI with scoped subject, unit, topic, type and language filters.
- Extended `GET /api/materials` with `topicId` and `language` filters plus explicit invalid-unit and out-of-scope-topic validation.
- Added a lesson-studio Practice action that launches `/practice` with subject, unit, lesson and topic query context.
- Updated Practice to initialize subject/unit/topic filters from URL parameters and pass topic filters into `/api/questions`.
- Added optional `QuestionAttempt.lessonId` through migration `20260628212500_add_question_attempt_lesson_context`.
- `POST /api/progress` now accepts lesson context for practice attempts, validates the lesson against the current learning scope and the submitted question's subject/topic/unit, and stores it on the attempt.
- Lesson completion policy now treats lesson-scoped question attempts as practice evidence for `requirePractice`.

### Coverage Snapshot

- 2 programmes, 12 semester slots.
- 8 of 12 manifests present.
- 59 subject structures present.
- 0 promoted units, topics and lessons in manifests.
- 131 current manifest-matching YouTube candidate rows, all draft/unpublished.
- 100 total candidate URLs checked for reachability; 100 healthy, 0 stale/unhealthy/unknown.
- 131 manifest-matching candidate rows are included in the learning coverage link-health rollup; all 131 are healthy.
- 194 pending verification items.

### Additional Verification

- `npm run test -- src/features/learning/utils/learning-search.test.ts src/features/learning/utils/lesson-slugs.test.ts`: passed, 2 files, 7 tests.
- `npm run test -- src/lib/curriculum/coverage-report.test.ts src/features/learning/utils/learning-search.test.ts`: passed, 2 files, 4 tests.
- `npm run coverage:learning`: passed and wrote the report.
- `npm run resources:link-health -- --limit 5`: passed as a 5-row dry run; npm/PowerShell forwarded this as positional `5`.
- `npx tsx scripts/check-resource-link-health.ts --write`: passed, 100 rows checked and report written.
- `npm run test -- src/lib/resources/link-health.test.ts src/lib/resources/lesson-resource-policy.test.ts`: passed, 2 files, 8 tests.
- `npm run test -- src/lib/curriculum/coverage-report.test.ts src/lib/resources/link-health.test.ts`: passed, 2 files, 3 tests.
- `npm run test -- src/lib/lesson-notes/lesson-note-files.test.ts src/lib/lesson-notes/lesson-note-document.test.ts`: passed, 2 files, 5 tests.
- Targeted ESLint for scoped search, command palette, unit route, coverage report and coverage script: passed.
- Targeted ESLint for the admin coverage page, admin nav and admin dashboard: passed.
- Targeted ESLint for lesson-note preview files and admin notes routes: passed.
- Targeted ESLint for Materials UI and `/api/materials`: passed.
- Targeted ESLint for Practice and the lesson studio page: passed.
- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npm run check:migrations`: passed.
- `npm run test -- src/features/learning/server/lesson-completion-policy.test.ts`: passed, 1 file, 4 tests.
- Targeted ESLint for completion policy, progress route, schema and Practice: passed.
- `npm run typecheck`: passed.

## Phase 8 Progress: Official COMP Advanced-Semester Structure

### Changed

- Added structure-verified COMP/DCOMP Semester 3-6 manifests from the official Computer Engineering R23 curriculum PDF:
  - `content/curriculum/cwit-r23/comp/semester-3.json`
  - `content/curriculum/cwit-r23/comp/semester-4.json`
  - `content/curriculum/cwit-r23/comp/semester-5.json`
  - `content/curriculum/cwit-r23/comp/semester-6.json`
- Represented official Semester 5 and Semester 6 elective alternatives as separate DSE option rows with notes, keeping subject codes and manifest ordering importable without pretending every option is mandatory.
- Kept CIOT/DCIOT Semester 3-6 as missing manifests because the extracted official CIOT curriculum text is category-ordered and does not provide a clean semester placement table in the current local evidence.

### Additional Verification

- `npm run curriculum:validate`: passed, 8 manifests.
- `npm run coverage:learning`: passed and wrote the report with 8/12 manifests present and 194 pending verification items.

## Phase 9 Progress: Official Outcome Extraction

### Changed

- Added `src/lib/curriculum/official-course-extraction.ts` with tested official PDF text extraction for course blocks, source pages, course outcomes and conservative unit-title candidates.
- Reworked `scripts/extract-curriculum-unit-candidates.ts` so `npm run curriculum:extract-units` now covers all current manifests and writes `content/curriculum/cwit-r23/extraction-reports/official-structure-candidates.json`.
- Added unit-candidate quality diagnostics that block non-consecutive, duplicate, truncated, mojibake or table-noise titles from automatic promotion.
- Added `scripts/promote-curriculum-official-structure.ts` and `npm run curriculum:promote-official-structure`.
- Promoted official course outcomes into manifests for 51 of the 59 current subject structures:
  - DCOMP: 42 outcome-backed subjects across Semesters 1-6.
  - DCIOT: 9 outcome-backed subjects across Semesters 1-2.
- Kept unit-title promotion behind the explicit `--units` flag. Current extraction has 27 subjects with unit candidates, but 0 are safe for automatic unit promotion under the stricter quality gate.
- Extended the coverage report totals and admin dashboard to show `subjectsWithOutcomes` and `subjectsWithUnits`.

### Additional Verification

- `npm run test -- src/lib/curriculum/official-course-extraction.test.ts`: passed, 6 tests.
- `npm run curriculum:extract-units`: passed, 59 subject report(s).
- `npx tsx scripts/promote-curriculum-official-structure.ts --write --overwrite`: passed, 51 subject outcome set(s) written.
- `npm run curriculum:validate`: passed, 8 manifests.
- `npm run coverage:learning`: passed. Coverage now reports 8/12 manifests, 59 subjects and 51 subject structures with official outcomes.
- `npm run test -- src/lib/curriculum/coverage-report.test.ts src/lib/curriculum/official-course-extraction.test.ts`: passed, 2 files and 6 tests.
- Targeted ESLint for coverage report, official extraction and admin coverage page: passed.

## Phase 10 Progress: Validated Notes PDF Worker

### Changed

- Added `src/lib/lesson-notes/lesson-note-artifacts.ts` for stable, filesystem-safe lesson-note artifact naming.
- Added `scripts/render-lesson-note-pdfs.ts` and `npm run notes:render-pdf`.
- The renderer scans `content/lesson-notes` or explicit JSON file paths, validates every document with `LessonNoteDocumentSchema`, renders escaped print-safe HTML with `renderLessonNoteHtml()` and writes PDFs under `output/pdf/lesson-notes`.
- Optional `--html` writes the exact HTML artifact beside the PDF for reviewer/debug inspection.
- The worker does not generate note content and does not publish anything to students.

### Additional Verification

- `npm run test -- src/lib/lesson-notes/lesson-note-artifacts.test.ts src/lib/lesson-notes/lesson-note-document.test.ts`: passed, 2 files and 4 tests.
- `npm run notes:render-pdf`: passed, 0 document(s) rendered.
- Targeted ESLint for the artifact helper and PDF render script: passed.
- `npm run typecheck`: passed.

## Phase 11 Progress: YouTube Candidate Review Governance

### Changed

- Added `src/lib/resources/youtube-candidate-review.ts` to build a deterministic reviewer queue from metadata-checked YouTube candidates and verified local curriculum manifests.
- Added `scripts/build-youtube-candidate-review-queue.ts` and `npm run resources:youtube:review-queue`.
- Added `/admin/resources/youtube-candidates` and linked it from the existing resource review queue.
- Extended the learning coverage report and `/admin/learning/coverage` with YouTube review-queue readiness totals.
- The queue never creates `Resource` or `LessonResource` rows and never publishes candidate links to students.

### Current Queue Snapshot

- 100 metadata-checked YouTube candidates.
- 252 candidate subject mappings.
- 0 mappings ready for lesson-level review because verified units/topics/lessons are not present.
- 65 mappings blocked by unplaced official subjects from the catalog report.
- 18 mappings blocked by missing manifest subjects absent from the current official catalog report.
- 169 mappings blocked by missing verified lesson structure.

### Additional Verification

- `npm run test -- src/lib/resources/youtube-candidate-review.test.ts src/lib/resources/lesson-resource-policy.test.ts`: passed, 2 files and 9 tests.
- `npm run resources:youtube:review-queue`: passed and wrote `content/resources/youtube-candidates/cwit-r23-youtube-candidate-review-queue.json`.
- Targeted ESLint for the review-queue builder, script, admin page and linked resource queue: passed.
- `npm run test -- src/lib/curriculum/coverage-report.test.ts src/lib/resources/youtube-candidate-review.test.ts`: passed, 2 files and 4 tests.

## Phase 12 Progress: Student Publication Policy

### Changed

- Added `src/lib/resources/student-publication-policy.ts` as the shared student-visible publication policy for resources, lesson-resource mappings and generated documents.
- `scopedResourceWhere()`, lesson studio loading, learning search resource links and video progress writes now use the shared policy instead of duplicated inline status checks.
- Generated documents without an approved output resource now require an HTML or storage object key before they can appear in student lesson studio data.
- Draft, held, unverified, archived and private resources remain excluded from normal student queries.

### Additional Verification

- `npm run test -- src/lib/resources/student-publication-policy.test.ts src/lib/resources/youtube-candidate-review.test.ts src/lib/curriculum/coverage-report.test.ts`: passed, 3 files and 7 tests.
- Targeted ESLint for publication policy, scope queries, lesson studio, learning search and video progress route: passed.
- `npm run typecheck`: passed.

## Phase 13 Progress: Generated Content Workflow Guardrails

### Changed

- Added `src/lib/lesson-notes/generation-workflow.ts` as a pure state-transition policy for future lesson-note/content generation workers.
- The policy maps content-generation job states to generated-document statuses.
- It blocks direct completion from `running`, requires passing validation before reviewer handoff, requires an HTML/PDF artifact before review, requires reviewer approval before completion and requires error details on failed jobs.
- This is a workflow guardrail only; it does not generate, approve, publish or import student-facing content.

### Additional Verification

- `npm run test -- src/lib/lesson-notes/generation-workflow.test.ts src/lib/resources/student-publication-policy.test.ts`: passed, 2 files and 9 tests.
- Targeted ESLint for the generation workflow and publication policy modules: passed.

## Phase 14 Progress: Official Timetable Evidence Trail

### Changed

- Added the official CWIT Winter Examination 2025 timetable PDF to the local official-source set.
- Extracted timetable text to `tmp/pdfs/official/Winter-Examination-2025.txt` using `pdfplumber`.
- Added `src/lib/curriculum/timetable-evidence.ts` and `scripts/build-official-timetable-evidence.ts`.
- Added `scripts/extract-official-timetable-columns.py` and `npm run curriculum:extract-timetable-columns` for fixed-column PDF extraction.
- Added `npm run curriculum:extract-timetable`.
- Generated `content/curriculum/cwit-r23/extraction-reports/official-timetable-evidence.json` with exact whole-page and fixed-column R23 CP/CI code appearances.
- Added the timetable to `data/cwit/source-registry.json` as review-only evidence.
- Extended the learning coverage report and `/admin/learning/coverage` with timetable evidence counts.

### Evidence Boundary

- The timetable report found 41 CP/CI R23 code appearances: 7 from whole-page text extraction and 34 from fixed-column crops.
- The report groups those appearances into 34 unique codes: 17 COMP and 17 CIOT.
- The report records 0 publication-ready semester manifests.
- Timetable appearances do not verify CIOT Semester 3-6 placement and must not be promoted into manifests without an official semester-placement source.

### Additional Verification

- `npm run curriculum:extract-timetable-columns`: passed and wrote 4 fixed-column text crops.
- `npm run curriculum:extract-timetable`: passed and wrote 34 unique code entries from 41 total appearances.
- `npm run test -- src/lib/curriculum/timetable-evidence.test.ts src/lib/curriculum/coverage-report.test.ts`: passed, 2 files and 3 tests.
- `npm run coverage:learning`: passed and included timetable evidence totals in `content/reports/cwit-r23-learning-coverage.json`.

## Phase 15 Progress: Official Unit Candidate Review Queue

### Changed

- Added `src/lib/curriculum/unit-candidate-review.ts` as the review policy for official PDF unit-title candidates.
- Added `scripts/build-official-unit-candidate-review-queue.ts`.
- Added `npm run curriculum:unit-review-queue`.
- Generated `content/curriculum/cwit-r23/extraction-reports/official-unit-candidate-review-queue.json`.
- Added `/admin/learning/unit-candidates` as a read-only admin review surface for official unit extraction blockers.
- Linked Unit Review from admin navigation and the admin dashboard.
- Extended the learning coverage report and `/admin/learning/coverage` with official unit review readiness totals.

### Evidence Boundary

- The queue has 59 subject review rows.
- 27 subjects have extracted unit candidates that need manual review.
- 4 subjects are blocked because the course block was not extracted.
- 28 subjects are blocked because no unit candidates were extracted.
- 0 subjects are ready for unit promotion review; no units, topics or lessons were promoted.

### Additional Verification

- `npm run curriculum:unit-review-queue`: passed and wrote 59 subject review rows.
- `npm run test -- src/lib/curriculum/unit-candidate-review.test.ts`: passed, 1 file and 1 test.

## Phase 16 Progress: Official Course Catalog Review

### Changed

- Extended `src/lib/curriculum/official-course-extraction.ts` with `extractOfficialCourseCatalog()` for source-backed course code/name extraction from official curriculum PDF course blocks.
- Added `scripts/build-official-course-catalog.ts`.
- Added `npm run curriculum:extract-catalog`.
- Generated `content/curriculum/cwit-r23/extraction-reports/official-course-catalog.json`.
- Added `/admin/learning/course-catalog` as a read-only admin review surface for unplaced official course identities.
- Linked Course Catalog from admin navigation and the admin dashboard.
- Extended the learning coverage report and `/admin/learning/coverage` with official catalog totals and placement readiness.
- Refined the YouTube candidate review queue to split unplaced official-subject blockers from truly missing manifest-subject blockers.
- Fixed the shared Lernio logo tile dimensions so responsive alignment tests do not depend on Tailwind detecting dynamic width/height class strings.

### Evidence Boundary

- The catalog contains 81 official course entries: 45 COMP and 36 CIOT.
- 59 local manifest subject codes are already placed.
- 26 official course entries are unplaced, all CIOT entries.
- The YouTube review queue now reports 65 unplaced official-subject blockers separately from 18 missing manifest-subject blockers.
- The catalog proves course identity only. It does not prove semester placement and must not be used to generate CIOT Semester 3-6 manifests.

### Additional Verification

- `npm run curriculum:extract-catalog`: passed and wrote 81 official course entries with 26 unplaced entries.
- `npm run test -- src/lib/curriculum/official-course-extraction.test.ts src/lib/curriculum/coverage-report.test.ts`: passed, 2 files and 8 tests.
- `npm run coverage:learning`: passed and included official catalog totals in `content/reports/cwit-r23-learning-coverage.json`.

## Phase 17 Progress: Coding Curriculum Scope

### Changed

- Added optional `subjectId`, `unitId`, `topicId`, `lessonId`, `sourceEvidence`, `status` and `updatedAt` fields to `CodingChallenge`.
- Added optional `subjectId`, `unitId`, `topicId` and `lessonId` fields to `CodingSubmission`.
- Added relation fields from Subject, Unit, Topic and Lesson to coding challenges/submissions.
- Added migration `prisma/migrations/20260629142000_add_coding_curriculum_scope/migration.sql`.
- Added `src/lib/coding/coding-scope.ts` for student learning-scope challenge filters and submission context derivation.
- Scoped `GET /api/coding` to global published challenges plus in-scope subject/unit/topic/lesson-linked challenges.
- Scoped coding draft saves so out-of-scope challenge IDs are rejected and saved submissions inherit the challenge curriculum context.
- Extended the Coding Lab UI with subject, unit and lesson badges when the API returns linked challenge metadata.

### Evidence Boundary

- Existing unlinked coding challenges remain visible as global published practice.
- This adds the schema/API/UI scope foundation only. Curriculum-linked challenge imports, reviewer-approved mappings and the production C++ runner are still required before coding is complete.

### Additional Verification

- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npm run check:migrations`: passed.
- `npx vitest run src/lib/coding/coding-scope.test.ts src/features/learning/server/get-student-learning-scope.test.ts`: passed, 2 files and 8 tests.
- `npm run typecheck`: passed.

## Phase 18 Progress: LEO Approved Resource Grounding

### Changed

- Extended `src/lib/ai/retrieval.ts` so LEO retrieves student-visible `LessonResource` rows and approved generated lesson documents alongside the existing five-mode lesson JSON content.
- Reused `studentLessonResourceWhere()` and `studentGeneratedDocumentWhere()` so draft, private, unverified, held or archived artifacts do not enter normal student grounding.
- Added approved video chapter transcript snippets to the retrieved course context when chapter rows are verified/approved.
- Added approved generated note/document artifact metadata as retrievable sources.
- Changed context/citation grouping so prompt source numbers and saved citation payloads stay aligned after source deduplication.
- Added `src/lib/ai/retrieval.test.ts` for resource/document chunking and citation-number alignment.

### Evidence Boundary

- Retrieval can now use approved lesson resources and generated documents when they exist.
- Most candidate videos and generated notes are still not published `LessonResource` or approved document rows, so this is a grounding capability improvement rather than content publication.

### Additional Verification

- `npx vitest run src/lib/ai/retrieval.test.ts src/lib/ai/groq-provider.test.ts`: passed, 2 files and 7 tests.
- `npm run typecheck`: passed.

## Phase 19 Progress: Lesson-Level Materials Filtering

### Changed

- Extended `GET /api/materials` with an optional `lessonId` query parameter.
- Validated `lessonId` against the student's current learning scope through `scopedLessonWhere()`.
- Returned only student-visible approved/verified `LessonResource` rows for lesson-scoped material requests.
- Preserved existing subject, unit, topic, type, language and search filters when `lessonId` is present.
- Updated the Materials UI to read `lessonId` from the URL, show a lesson-scoped filter banner and display the `LessonResource` role badge on linked materials.
- Added a Lesson Studio resources action that opens `/materials?lessonId=...` for the current lesson.

### Evidence Boundary

- The API/UI can now consume published lesson-resource mappings.
- Production usefulness still depends on reviewer-approved `LessonResource` rows being imported/published.

### Additional Verification

- `npm run typecheck`: passed.

## Phase 20 Progress: Restrictive CSP Alignment

### Changed

- Added a shared `buildContentSecurityPolicy()` helper for proxy and static Next headers.
- Kept proxy CSP nonce support for app pages and removed broad `https:`/`wss:` proxy source allowances.
- Allowed only the required YouTube script/embed origins plus the configured storage origin for images, media, frames and client connections.
- Preserved local development websocket allowances without carrying them into production CSP.

### Additional Verification

- `npx vitest run src/lib/security/content-security-policy.test.ts`: passed, 1 file and 4 tests.
- `npm run typecheck`: passed.
- `npm run build`: passed with 90 static pages generated.

## Phase 21 Progress: Planner Lesson Context

### Changed

- Added nullable `lessonId`, `canonicalUrl` and `sourceReason` fields to `StudyTask`.
- Added scoped lesson-reference helpers that derive subject, topic, duration and canonical lesson routes from the current learning scope.
- Updated planner task create/update/delete scope checks to validate direct lesson references and derive lesson URLs server-side.
- Updated auto-plan generation so weak-topic and due-revision tasks attach the first scoped lesson for the topic when available.
- Updated the Planner UI to show source reasons and direct canonical lesson links for lesson-backed tasks.
- Fixed manual planner task validation so UI-offered `study` and `rest` task types are accepted by the API.

### Additional Verification

- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npx vitest run src/features/learning/server/get-student-learning-scope.test.ts`: passed, 1 file and 5 tests.
- `npm run typecheck`: passed.
- `npm run check`: passed, 43 files and 149 tests with 129 existing warnings and 0 errors.
- `npm run build`: passed with 90 static pages generated.

## Phase 22 Progress: Revision Source Lesson Handoff

### Changed

- Added `firstLessonReferenceForTopic()` to derive the first scoped lesson for a revision topic.
- Enriched `/api/revision/due` schedule responses with `sourceLesson` metadata for canonical lesson return links.
- Enriched `/api/revision/flashcards` cards with source lesson id, title, canonical URL and duration.
- Updated classic revision rows, active revision sessions and 3D flashcards to link back to source lessons when available.

### Additional Verification

- `npx vitest run src/features/learning/server/get-student-learning-scope.test.ts`: passed, 1 file and 5 tests.
- `npm run typecheck`: passed.
- `npm run check`: passed, 43 files and 149 tests with 129 existing warnings and 0 errors.
- `npm run build`: passed with 90 static pages generated.

## Phase 23 Progress: Authority-Scoped Learning Ops Preview

### Changed

- Added `requireLearningOpsPreviewAccess()` and report-code matching for scoped teacher, coordinator, reviewer and admin Learning OS previews.
- Scoped `/admin/learning/coverage`, `/admin/learning/course-catalog`, `/admin/learning/unit-candidates`, `/admin/resources/youtube-candidates` and `/admin/learning/notes` by authorised subject/programme/department codes.
- Scoped note detail and print routes so direct note slugs return 404 outside the caller's academic authority.
- Scoped the live resource review queue by subject ids and kept provider-policy management admin-only.
- Added resource-review write protection so only admin or users with resource review/publish capability can approve or request changes.
- Added teacher, coordinator and reviewer workspace links into the scoped learning-ops surfaces.

### Additional Verification

- `npx vitest run src/lib/learning/learning-ops-authority.test.ts src/lib/resources/resource-governance.test.ts`: passed, 2 files and 8 tests.
- `npm run typecheck`: passed.
- `npm run check`: passed, 44 files and 153 tests with 129 existing warnings and 0 errors.
- `npm run build`: passed with 90 static pages generated.

## Phase 24 Progress: Lesson-Scoped Quiz Evidence

### Changed

- Constrained lesson-linked quiz attempt creation to the lesson's topic when available, otherwise the lesson's unit.
- Rejected conflicting `unitNumbers` when a lesson-linked attempt is requested.
- Stored server-derived `lessonScope` provenance in `QuizAttempt.questionsJson`.
- Updated lesson completion policy so quiz-pass evidence counts only when the stored question set was generated for the same lesson scope.

### Additional Verification

- `npx vitest run src/features/learning/server/lesson-completion-policy.test.ts`: passed, 1 file and 7 tests.
- `npm run typecheck`: passed.
- `npm run check`: passed, 44 files and 155 tests with 129 existing warnings and 0 errors.
- `npm run build`: passed with 90 static pages generated.

## Phase 25 Progress: Curriculum-Aware Labs Integration

### Changed

- Scoped the labs API route (`GET /api/labs`) to the student's current learning scope, returning published/verified `PracticalExperiment` records and structured blocker information when empty.
- Updated `src/components/views/labs.tsx` to fetch labs from the scoped `/api/labs` API and render either the official practicals or an explicit blocker message.
- Created unit tests for `/api/labs` GET route verifying scope enforcement, db queries, mapping, and blocker messages.

### Additional Verification

- `npx vitest run src/app/api/labs/route.test.ts`: passed (3 tests).
- `npm run check`: passed, 45 files and 158 tests with 129 existing warnings and 0 errors.
- `npm run build`: passed with 91 static pages generated.

## Phase 26 Progress: Trusted Coding Runner Integration

### Changed

- Added `src/lib/coding/code-runner.ts` as the trusted remote runner client for Coding Lab submissions.
- Added signed runner requests with `CODE_RUNNER_URL`, optional bearer token and optional HMAC signature support.
- Added defensive runner response validation so a pass is accepted only when the runner returns a complete all-tests-passed result for the reviewed test set.
- Updated `POST /api/coding` to execute reviewed challenge tests only through the configured runner, persist `passed`/`failed`/`error`, hide expected test values from the browser response, and award idempotent `coding_pass` XP only for validated passes.
- Kept syntax preview as non-executing structural feedback only.
- Updated the Coding Lab UI to show runner-gated submit results while preserving manual-review fallback when runner execution is unavailable.
- Documented runner environment variables in `.env.example`.
- Added focused tests for runner configuration, request signing, incomplete result rejection, parser behavior and hidden expected-test values.

### Additional Verification

- `npx vitest run src/lib/coding/code-runner.test.ts`: passed (6 tests).
- `npm run typecheck`: passed.
- `npm run check`: passed, 46 files and 164 tests with 129 existing warnings and 0 errors.
- `npm run build`: passed with 91 static pages generated.

## Phase 27 Progress: Lesson Resource Mapping Review Workflow

### Changed

- Added `UpsertLessonResourceMappingSchema`, scoped lesson mapping option loading and `upsertLessonResourceMapping()` to resource governance.
- The mapping workflow validates reviewer scope, same-subject lesson/resource ownership, start/end offsets, reviewer evidence for approval, and approved/verified/clear resource status before publishing a lesson mapping.
- Approved primary-video mappings mark the selected resource primary and clear primary flags from other primary-video mappings for the same lesson.
- The admin resource review queue now includes lesson mapping controls with a lesson selector, governed `LessonResource` role selector, reviewer evidence field, draft-map action and approve-map action.
- Mapping writes are audited as `lesson_resource.drafted` or `lesson_resource.approved`.
- Added schema tests for governed lesson resource mapping payloads.

### Additional Verification

- `npx vitest run src/lib/resources/resource-governance.test.ts`: passed (6 tests).
- `npm run typecheck`: passed.
- `npm run check`: passed, 46 files and 166 tests with 129 existing warnings and 0 errors.
- `npm run build`: passed with 91 static pages generated.

## Phase 28 Progress: Lesson Note Generation Worker Boundary

### Changed

- Added `src/lib/lesson-notes/generation-worker.ts` to claim queued `ContentGenerationJob` rows, lease/retry them, build approved-source lesson-note inputs, call a configured generation provider, validate the generated `LessonNoteDocument`, write review-ready HTML through a configured artifact store and persist `GeneratedLessonDocument` rows as `ready_for_review`.
- Added HTTP provider and artifact-store adapters behind `LESSON_NOTE_GENERATOR_*` and `LESSON_NOTE_ARTIFACT_STORE_*` environment variables. Production requires tokens when those services are configured.
- Added `npm run notes:generate:work` as the out-of-band worker command. Generation jobs are not run during builds or normal page rendering.
- Added `/api/admin/learning/notes/jobs` so scoped learning-ops reviewers/admins can list and queue generation jobs for in-scope published/verified lessons. Job creation is audited and active jobs are reused unless `forceNew` is requested.
- Extended generation workflow transitions so transient provider/storage errors can requeue with backoff while validation failures remain review-blocking.
- Added focused worker and queue-route tests for leasing, review-ready handoff, self-publish rejection, metadata mismatch validation, retry backoff, scoped queue creation and scoped queue listing.

### Additional Verification

- `npx vitest run src/lib/lesson-notes/generation-worker.test.ts src/app/api/admin/learning/notes/jobs/route.test.ts`: passed (9 tests).
- `npm run typecheck`: passed.
- `npm run check`: passed, 48 files and 175 tests with 129 existing warnings and 0 errors.
- `npm run build`: passed with 92 static pages generated.

## Phase 29 Progress: Controlled Generated Note Delivery

### Changed

- Added `src/lib/storage/signed-object-url.ts` for bounded signed object URLs using `STORAGE_PUBLIC_BASE_URL`, `STORAGE_SIGNING_SECRET` and `STORAGE_SIGNED_URL_TTL_SECONDS`. Production requires a signing secret.
- Added `/api/learning/notes/[documentId]` to verify the signed-in user's current learning scope and `studentGeneratedDocumentWhere()` before redirecting to signed HTML/PDF artifacts or an approved output resource URL.
- Updated `getLessonStudio()` so generated documents expose `htmlHref` and `pdfHref` only; raw `htmlObjectKey` and `storageObjectKey` values are no longer returned to the lesson page.
- Updated the canonical lesson page to open generated HTML notes and PDF downloads through the controlled note delivery route.
- Added tests for signed object URL construction, production secret enforcement, in-scope note delivery, PDF attachment redirects, storage-unconfigured failure and unresolved-scope denial.

### Additional Verification

- `npx vitest run src/lib/storage/signed-object-url.test.ts src/app/api/learning/notes/[documentId]/route.test.ts`: passed (7 tests).
- `npm run typecheck`: passed.
- `npm run check`: passed, 50 files and 182 tests with 129 existing warnings and 0 errors.
- `npm run build`: passed with 92 static pages generated.

## Phase 30 Progress: Database-Backed Published Coverage Snapshot

### Changed

- Added `src/lib/curriculum/database-coverage-report.ts` to calculate live coverage from student-visible database rows instead of manifest/candidate files only.
- The database snapshot counts published schemes, subjects, units, topics, lessons, approved primary videos, approved HTML/PDF generated notes, lesson-scoped practice coverage, approved lesson resources, generated documents, published resources, broken resources, questions, practical experiments, coding challenges and pending review items.
- Extended `scripts/build-learning-coverage-report.ts` with `--with-db` and `--require-db`.
- `--with-db` attaches a live database snapshot when PostgreSQL is reachable and records an unavailable marker when it is not.
- `--require-db` is a hard release gate for production checks that must fail if database coverage cannot be calculated.
- Updated `/admin/learning/coverage` to render the attached published database coverage summary and scope-filter it for teacher, coordinator and reviewer authority.
- Updated the static coverage report source note so operators know when to run the DB-backed mode.

### Evidence Boundary

- The live database coverage implementation is present and unit-tested.
- The local environment still cannot produce a real live snapshot because PostgreSQL at `localhost:5432` is unreachable.
- The committed report was regenerated in the default offline mode; `--with-db` was exercised locally and correctly reported database coverage unavailable.

### Additional Verification

- `npx vitest run src/lib/curriculum/coverage-report.test.ts src/lib/curriculum/database-coverage-report.test.ts`: passed, 2 files and 3 tests.
- `npm run typecheck`: passed.
- `npm run coverage:learning`: passed and regenerated `content/reports/cwit-r23-learning-coverage.json`.
- `npx tsx scripts/build-learning-coverage-report.ts --with-db`: passed and reported database coverage unavailable because local PostgreSQL is unreachable.

## Remaining Manual Verification

- Database dry-run/write needs a reachable PostgreSQL connection.
- Official R23 PDFs are structure parsed for COMP Semesters 1-6 and CIOT Semesters 1-2 only; CIOT Semesters 3-6 still need a semester-placement source or manual official verification before manifest promotion. The Winter 2025 timetable now supplies code-appearance evidence only, not semester placement.
- The official course catalog proves 26 additional CIOT course identities, but those entries remain unplaced until an official semester-placement source is obtained.
- Units, topics and practical experiments still need official curriculum parsing and review before publication. The unit review queue reports 27 subjects with candidate units, 4 missing course blocks, 28 subjects with no unit candidates and 0 subjects ready for promotion.
- Eight current subject structures still lack promoted official outcomes because their extracted source blocks are missing or need manual review.
- YouTube resources are draft candidates only; oEmbed metadata exists for 6 direct videos, 94 playlists still need YouTube Data API or manual review and no lesson mapping has been published. The review queue has 252 subject mappings, 0 ready for lesson mapping, 65 unplaced official-subject blockers, 18 missing manifest-subject blockers and 169 lesson-structure blockers.
- Link-health checks prove current URL reachability only, not lesson fit, playlist membership, captions, duration or embeddability.
- Poppler `pdftoppm` is not installed, but the Winter 2025 timetable was rendered with `pypdfium2` to `tmp/pdfs/rendered/Winter-Examination-2025-page-1.png` and visually inspected as legible/nonblank.
- Practical experiments still need manual review and import before they can populate the scoped Labs UI.
- Coding now supports optional curriculum links, scoped API filtering and trusted runner integration; reviewed challenge mappings/imports and deployed runner service credentials are still pending.
- Materials now filter by scoped subject/unit/topic/type/language and optional lesson-level `LessonResource` mappings; admins/reviewers can now draft or approve lesson-resource mappings from the resource queue, but production coverage still needs reviewed content imports and published mappings.
- XP ledger totals remain user-global where historical XP events do not contain reliable curriculum subject ownership.
- Completion criteria now consume lesson-scoped practice attempts and lesson-scoped quiz-pass evidence; production usefulness still depends on reviewed lesson question coverage.
- Lesson notes now have scoped reviewer/admin previews, a local validated PDF render worker, an audited generation queue API and a provider/storage-backed worker boundary, but production provider/storage credentials, reviewer approval/publication and approved note documents are still pending.
- Database-backed published lesson/resource coverage is implemented, but live production numbers still need `npx tsx scripts/build-learning-coverage-report.ts --require-db` against a reachable PostgreSQL database.

## Latest Local Validation on 2026-06-29

- `npm run curriculum:validate`: passed, 8 manifest(s) valid.
- `npm run curriculum:extract-units`: passed, 59 subject report(s) written to `content/curriculum/cwit-r23/extraction-reports/official-structure-candidates.json`.
- `npm run curriculum:extract-timetable-columns`: passed, 4 fixed-column text crop(s) written to `tmp/pdfs/official/Winter-Examination-2025.columns.json`.
- `npm run curriculum:extract-timetable`: passed, 41 CP/CI timetable code appearance(s), 34 unique code(s), and 0 publication-ready semester manifest(s) written to `content/curriculum/cwit-r23/extraction-reports/official-timetable-evidence.json`.
- `npm run curriculum:extract-catalog`: passed, 81 official course entries, 59 local manifest subject codes and 26 unplaced official CIOT entries.
- `npm run curriculum:unit-review-queue`: passed, 59 official unit review row(s), 27 needing manual review, 32 blocked and 0 ready for promotion.
- `npx tsx scripts/promote-curriculum-official-structure.ts --units --overwrite`: dry-run passed, 0 subject unit set(s) promotable under the current quality gate.
- `npx tsx scripts/promote-curriculum-official-structure.ts --write --overwrite`: passed, 51 official subject outcome set(s) written.
- `npm run notes:validate`: passed, 0 document(s) present/valid.
- `npm run notes:render-pdf`: passed, 0 document(s) rendered.
- `npx vitest run src/lib/lesson-notes/generation-worker.test.ts src/app/api/admin/learning/notes/jobs/route.test.ts`: passed, 2 files and 9 tests.
- `npm run check`: passed, including migration encoding, lint, typecheck and 51 Vitest files / 183 tests. Lint still reports 129 existing warnings and 0 errors.
- `npm run lint`: passed with 0 errors and 129 existing warnings.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npx prisma migrate status`: failed because the configured PostgreSQL database at `localhost:5432` is unreachable in the local environment.
- `npm run check:migrations`: passed.
- `npx vitest run src/lib/coding/coding-scope.test.ts src/features/learning/server/get-student-learning-scope.test.ts`: passed, 2 files and 8 tests.
- `npx vitest run src/lib/ai/retrieval.test.ts src/lib/ai/groq-provider.test.ts`: passed, 2 files and 7 tests.
- `npx vitest run src/app/api/labs/route.test.ts`: passed, 1 file and 3 tests.
- `npm run coverage:learning`: passed and wrote `content/reports/cwit-r23-learning-coverage.json` with 12/12 manifests present, 59 subject structures, 51 outcome-backed subject structures, 0 subject structures with promoted units, 27 unit candidate review rows needing manual review, 252 YouTube review-queue subject mappings, 65 unplaced official-subject blockers, 18 missing manifest-subject blockers, 34 unique timetable evidence codes, 81 official catalog course entries and 194 pending verification items.
- `npx vitest run src/lib/curriculum/coverage-report.test.ts src/lib/curriculum/database-coverage-report.test.ts`: passed, 2 files and 3 tests.
- `npx tsx scripts/build-learning-coverage-report.ts --with-db`: passed and reported database coverage unavailable because local PostgreSQL is unreachable.
- `npm run content:import:youtube-guides -- --sem12 content-import/CWIT_Semester_1_2_YouTube_Lecture_Links.pdf --sem36 content-import/CWIT_Semester_3_to_6_YouTube_Lecture_Links.pdf --dry-run`: passed, extracting 103 deduplicated source URL rows, 102 unique URLs, 100 draft candidates and 3 skipped non-YouTube URLs from the supplied PDFs.
- `npm run resources:youtube:candidates`: passed, 100 candidate(s) written.
- `npx tsx scripts/verify-youtube-candidates.ts --write`: passed, 100 metadata check(s), 6 found and 94 unavailable/unverified by public oEmbed.
- `npm run resources:youtube:review-queue`: passed, 100 candidate(s), 252 subject mapping(s), 0 ready for lesson mapping, 65 unplaced official-subject blockers, 18 missing manifest-subject blockers and 169 lesson-structure blockers.
- `npx tsx scripts/check-resource-link-health.ts --write`: passed and wrote 100 checked rows; 100 healthy, 0 stale/unhealthy/unknown.
- `npm run build`: passed with 92 static pages generated and `/api/coding`, `/api/admin/learning/notes/jobs` plus LEO tutor routes included.
- `npm run test:e2e`: passed against `next start` production server, 146 Playwright tests.
- Smoke checks against `next start`: `/api/health` returned 200 and `/api/ready` returned 503 because PostgreSQL is unavailable.
- Production server was started with `npm run start` on `http://localhost:3000` for smoke/e2e validation, then stopped.
- Smoke checks: `/api/health` returned 200; protected learning/admin/search URLs redirected to sign-in as expected, including `/learn/DCOMP/semester/3`.
- Readiness check: `/api/ready` returned 503 because local PostgreSQL at `localhost:5432` is unavailable. Auth is configured; AI and email are unconfigured in the local environment.

## Next Phase

1. Add integration tests for `getStudentLearningScope()` using database fixtures when the local DB is reachable.
2. Manually review and repair official unit/topic/practical structures from `official-unit-candidate-review-queue.json`; no unit set is currently ready for promotion.
3. Find or obtain official CIOT Semester 3-6 semester-placement evidence beyond review-only timetable code appearances.
4. Run database-backed manifest import dry-run/write and `coverage:learning --require-db` once PostgreSQL is reachable.
5. Add lesson-level YouTube mapping review workflow.
