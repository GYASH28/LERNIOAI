# Data Migration Plan

## Migration Strategy

1. Additive migrations first.
2. Backfill existing rows.
3. Deploy compatibility code that supports old and new data.
4. Import curriculum/resource candidates in dry-run mode.
5. Review and publish verified content.
6. Switch student routes and dashboard to scoped queries.
7. Archive non-target department visibility.
8. Remove obsolete compatibility code only after verification.

## Phase 1 Department Scope

Target active departments/programmes:

- COMP / DCOMP
- CIOT / DCIOT

Archived/hidden departments/programmes:

- CIVIL / DCIV
- ELEC / DELEC
- ENTC / DENTC
- MECH / DMECH
- SH / FYSH
- any other non-target department/programme found in the deployment database

Rules:

- No hard deletion.
- Preserve users, audit events, role assignments, class groups, schemes and content rows.
- Set `status = archived` and `archivedAt` where supported.
- Keep shared first-year content through subject applicability/offering rows, not by exposing SH as a selectable programme.

Commands:

```bash
npm run db:departments:scope -- --dry-run
npm run db:departments:scope -- --write
```

## Phase 3 Schema Additions

Add:

- `LessonResource`
- `VideoChapter`
- `VideoWatchProgress`
- `GeneratedLessonDocument`
- `ContentGenerationJob`
- `LessonCompletionCriteria`
- optional `QuestionAttempt.lessonId` for lesson-scoped practice evidence

Migrations:

```text
prisma/migrations/20260628172000_add_lesson_resource_studio/migration.sql
prisma/migrations/20260628212500_add_question_attempt_lesson_context/migration.sql
```

Backfill:

- Convert approved `ResourceTopicMapping` rows to `LessonResource` where lesson-topic relationships are unambiguous.
- Leave ambiguous rows pending review.
- Convert curated YouTube links to `Resource` plus `LessonResource` only after title, canonical URL, source PDF and lesson coverage are validated.
- Create `VideoChapter` rows only from verified timestamps or reviewed transcript segmentation.
- Keep generated lesson documents in `draft` or `pending_review` state until the existing reviewer/admin publication workflow approves them.
- Existing question attempts remain valid with `lessonId = null`; only practice launched from canonical lessons writes lesson context.

Rollback:

- Keep additive tables independent.
- Do not drop existing `ResourceTopicMapping`.
- Disable Lesson Studio import/generation routes and continue serving the existing `/learn` experience if needed.
- Because the migration is additive, rollback can be performed by disabling feature flags/code paths without deleting historical rows.

## Curriculum Data Migration

Create versioned manifests under:

```text
content/curriculum/cwit-r23/
  comp/
  ciot/
  schemas/
```

Import rules:

- Dry-run diff before write.
- One source-evidence record per subject/unit/topic/lesson.
- `pending_verification` content remains hidden from students.
- Validate manifests before import:

```bash
npm run curriculum:validate
npm run curriculum:extract-units
npm run curriculum:extract-timetable-columns
npm run curriculum:extract-timetable
npm run curriculum:extract-catalog
npm run curriculum:unit-review-queue
npm run curriculum:promote-official-structure
npx tsx scripts/promote-curriculum-official-structure.ts --write --overwrite
npx tsx scripts/promote-curriculum-official-structure.ts --units --overwrite
npm run coverage:learning
npm run curriculum:import
npm run curriculum:import -- --write
```

Current manifest status:

- COMP Semester 1-6 and CIOT Semester 1-2 subject structures are `structure_verified`.
- 51 current subject structures have official course outcomes promoted from the official curriculum PDFs.
- Units, topics and practical experiments remain draft/empty until parsed from official curriculum PDFs.
- `curriculum:extract-units` creates a review-only extraction report and does not mutate manifests or the database.
- The extraction report includes `unitQuality` blockers; current local extraction has 27 subjects with unit candidates and 0 safe automatic unit promotions.
- `curriculum:extract-timetable-columns` extracts fixed-column text from the Winter 2025 timetable PDF for review-only code evidence.
- `curriculum:extract-timetable` creates a review-only official timetable evidence report from the Winter 2025 timetable PDF and does not mutate manifests or the database.
- The timetable report currently has 41 CP/CI R23 code appearances, 34 unique codes and 0 publication-ready semester manifests; it must not be used to infer CIOT Semester 3-6 placement.
- `curriculum:extract-catalog` creates a review-only official course catalog report and does not mutate manifests or the database.
- The course catalog report currently has 81 official course entries, 59 local manifest subject codes and 26 unplaced official CIOT entries blocked until an official semester-placement source is obtained.
- `curriculum:unit-review-queue` converts the official unit extraction report into reviewer statuses and does not mutate manifests or the database.
- The unit review queue currently has 59 subject rows, 27 needing manual review, 32 blocked and 0 ready for promotion.
- `curriculum:promote-official-structure` dry-runs outcome promotion by default; use direct `npx tsx ... --write --overwrite` when PowerShell/npm argument forwarding strips write flags.
- Unit promotion requires `--units`; do not write unit promotion until the dry-run reports only manually reviewed clean unit structures.
- Import scripts must not publish these records as complete lessons until those sections are populated and reviewed.
- `curriculum:import` is non-publishing: subject rows are written with `status = draft`.
- The latest local dry run could not complete because the configured PostgreSQL connection timed out before the first query.
- The coverage report is file-backed and can run without a database connection; it should be reviewed before import/write operations.

## YouTube Candidate Migration

Generate candidate resources:

```bash
npm run resources:youtube:candidates
```

Check public metadata without publishing:

```bash
npm run resources:youtube:verify
npx tsx scripts/verify-youtube-candidates.ts --write
npm run resources:youtube:review-queue
npm run resources:link-health
npx tsx scripts/check-resource-link-health.ts --write
```

Rules:

- Candidate rows remain `draft` and `pending_metadata_verification`.
- Metadata-checked rows remain `draft` and `metadata_checked_unreviewed`; they are not verified or published.
- Non-YouTube URLs extracted from the PDFs are recorded in `skippedUrls`, not imported as video resources.
- oEmbed can confirm public metadata for some direct videos, but cannot provide duration, captions, age restriction or playlist membership; those fields remain unchecked without YouTube Data API or manual review.
- Link health checks record URL reachability in `content/reports/cwit-r23-link-health.json`; they do not prove lesson fit, embeddability or publication readiness.
- The review queue records draft candidate-to-subject mappings in `content/resources/youtube-candidates/cwit-r23-youtube-candidate-review-queue.json`; it blocks mappings with unplaced official subjects, missing manifest subjects or missing verified lesson structure.
- Do not attach candidates to `LessonResource` until canonical URL, title/channel metadata, source page, subject fit, lesson coverage, embeddability and reviewer approval are complete.
- Rollback is delete/ignore candidate import batches only; do not remove reviewed/published `Resource` rows without an explicit destructive operation.

## Lesson Note Artifact Rendering

Validated note JSON files can be rendered locally without publishing:

```bash
npm run notes:validate
npm run notes:render-pdf
npm run notes:render-pdf -- content/lesson-notes/example.json --html
```

Rules:

- `notes:render-pdf` must validate each JSON document before rendering.
- Output is written to `output/pdf/lesson-notes` and is not imported or published automatically.
- Generated documents still require reviewer approval and a future object-storage writer before they can become student-facing resources.
