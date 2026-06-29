# Resource and Content Provenance

## Current State

- `Resource` supports links, metadata, external IDs, thumbnails, duration, link health, review status, source trust and moderation status.
- `ResourceTopicMapping` maps resources to topics with coverage type, percent, offsets and review evidence.
- Admin resource queue can approve, request changes or hold resources and writes review/audit records.
- `LessonResource`, `VideoChapter`, `VideoWatchProgress`, `GeneratedLessonDocument`, `ContentGenerationJob` and `LessonCompletionCriteria` now exist in the Phase 3 schema migration.
- Generated notes/PDF provenance has first-class storage fields, generation metadata and reviewer/publisher fields.
- `src/lib/lesson-notes/lesson-note-document.ts` now defines the required note JSON contract and deterministic escaped HTML renderer.
- `src/lib/lesson-notes/generation-worker.ts` claims queued `ContentGenerationJob` rows, builds source-scoped lesson-note inputs from approved lesson resources and curriculum evidence, validates generated documents, writes review-ready HTML through a configured artifact-store adapter and never publishes AI output automatically.

## Supplied YouTube Inputs

| Source | Pages | Unique URLs extracted | Current status |
|---|---:|---:|---|
| `CWIT_Semester_1_2_YouTube_Lecture_Links.pdf` | 16 | 38 | candidate only |
| `CWIT_Semester_3_to_6_YouTube_Lecture_Links.pdf` | 26 | 65 | candidate only |

Extraction command:

```bash
npm run content:import:youtube-guides -- --sem12 content-import/CWIT_Semester_1_2_YouTube_Lecture_Links.pdf --sem36 content-import/CWIT_Semester_3_to_6_YouTube_Lecture_Links.pdf --dry-run
```

Write mode also emits ignored extraction outputs:

- `tmp/pdfs/CWIT_Semester_1_2_YouTube_Lecture_Links.txt`
- `tmp/pdfs/CWIT_Semester_1_2_YouTube_Lecture_Links.urls.json`
- `tmp/pdfs/CWIT_Semester_3_to_6_YouTube_Lecture_Links.txt`
- `tmp/pdfs/CWIT_Semester_3_to_6_YouTube_Lecture_Links.urls.json`

Candidate manifest:

- `content/resources/youtube-candidates/cwit-r23-youtube-candidates.json`
- `npm run resources:youtube:candidates`
- This writes the manifest from the source PDFs and deduplicates repeated raw URLs per supplied PDF before candidate IDs are assigned.

Metadata check report:

- `content/resources/youtube-candidates/cwit-r23-youtube-candidates.metadata.json`
- `npx tsx scripts/verify-youtube-candidates.ts --write`
- `npm run resources:youtube:verify` runs the same verifier, but PowerShell/npm argument forwarding may strip flags; use direct `npx tsx` for `--write` when needed.

Current manifest summary:

- 103 extracted URL rows.
- 102 unique extracted URLs.
- 100 draft YouTube candidates.
- 3 skipped non-YouTube URLs, all reported in `skippedUrls`.
- 100 candidates metadata-checked with YouTube oEmbed on 2026-06-28.
- 6 direct video candidates returned public oEmbed metadata.
- 94 playlist candidates require YouTube Data API or manual review for playlist/video membership, duration and embeddability details.
- No candidate is published or lesson-mapped.

Candidate review queue:

- `content/resources/youtube-candidates/cwit-r23-youtube-candidate-review-queue.json`
- `npm run resources:youtube:review-queue`
- `/admin/resources/youtube-candidates`
- 100 metadata-checked candidates are represented as 252 draft subject mappings.
- 0 mappings are ready for lesson-level review because verified units/topics/lessons are absent.
- 65 mappings are blocked by official subject codes that are present in the course catalog but unplaced in local manifests.
- 18 mappings are blocked by subject codes absent from local manifests and the official catalog report.
- 169 mappings are blocked by missing verified lesson structure.
- This queue is review-only and does not create `Resource` or `LessonResource` rows.

Link-health report:

- `content/reports/cwit-r23-link-health.json`
- `npx tsx scripts/check-resource-link-health.ts --write`
- `npm run resources:link-health` runs the checker; use direct `npx tsx` for `--write` when npm/PowerShell argument forwarding is unreliable.
- Latest result: 100 candidate URLs checked, 100 reachable, 0 stale/unhealthy/unknown.
- This checks URL reachability only; playlist membership, duration, captions and embeddability still require YouTube Data API or manual review.

## Official Timetable Evidence

- Source PDF: `content-import/official/Winter-Examination-2025.pdf`
- Extracted text: `tmp/pdfs/official/Winter-Examination-2025.txt`
- Fixed-column text crops: `tmp/pdfs/official/Winter-Examination-2025.columns.json`
- Review report: `content/curriculum/cwit-r23/extraction-reports/official-timetable-evidence.json`
- Column extractor: `npm run curriculum:extract-timetable-columns`
- Generator: `npm run curriculum:extract-timetable`
- Rendered visual check: `tmp/pdfs/rendered/Winter-Examination-2025-page-1.png`
- Current report totals: 41 CP/CI R23 code appearances, 34 unique codes, 17 COMP codes, 17 CIOT codes and 0 publication-ready semester manifests.
- The timetable is retained only as source-backed code-appearance evidence. It does not prove CIOT Semester 3-6 placement and does not create or publish curriculum, resource or lesson rows.

## Official Unit Candidate Review

- Source extraction report: `content/curriculum/cwit-r23/extraction-reports/official-structure-candidates.json`
- Review queue: `content/curriculum/cwit-r23/extraction-reports/official-unit-candidate-review-queue.json`
- Generator: `npm run curriculum:unit-review-queue`
- Admin view: `/admin/learning/unit-candidates`
- Current queue totals: 59 subject rows, 27 subjects with unit candidates needing manual review, 4 missing course blocks, 28 subjects with no unit candidates and 0 ready for promotion.
- Unit candidates remain draft review rows. They do not create manifest units, topics, lessons, notes or resource mappings.

## Official Course Catalog Review

- Source extraction report: `content/curriculum/cwit-r23/extraction-reports/official-course-catalog.json`
- Generator: `npm run curriculum:extract-catalog`
- Admin view: `/admin/learning/course-catalog`
- Current report totals: 81 official course entries, 59 local manifest subject codes and 26 unplaced official courses.
- The 26 unplaced entries are all CIOT course codes/names from official curriculum PDF course blocks.
- Catalog entries are source-backed course identity only. They do not prove semester placement and do not create or publish manifests, lessons, notes or resources.

## Generated Notes Contract

- `LessonNoteDocumentSchema` validates note type, template version, programme/semester/subject/unit/lesson identity, learning outcomes, sections, worked examples, practice items, glossary, sources and citation resolution.
- `renderLessonNoteHtml()` produces print-safe escaped HTML from validated note JSON.
- `npm run notes:validate` validates JSON files under `content/lesson-notes/` when present.
- `/admin/learning/notes` lists valid note JSON files through authority-scoped teacher/coordinator/reviewer/admin preview access.
- `/admin/learning/notes/[noteSlug]` renders validated notes in an iframe from escaped print-safe HTML and returns 404 for out-of-scope slugs.
- `/admin/learning/notes/[noteSlug]/print` returns private no-store raw HTML suitable for a future Playwright PDF rendering worker and uses the same authority scope check.
- `npm run notes:render-pdf` renders validated note JSON files to PDFs under `output/pdf/lesson-notes` using Playwright/Chromium and the same escaped HTML renderer.
- `src/lib/lesson-notes/generation-workflow.ts` defines the generation worker state policy: validation must pass before reviewer handoff, reviewer approval is required before completion, transient failures can requeue with backoff, and generation jobs cannot jump directly from running to completed.
- `src/lib/lesson-notes/generation-worker.ts` implements the provider/storage boundary for `ContentGenerationJob` processing. It accepts only generated documents whose programme, semester, subject, unit, lesson slug, deep link, document type, template version, target version and source IDs match the queued lesson input.
- `npm run notes:generate:work -- --limit 1` processes queued jobs when `LESSON_NOTE_GENERATOR_URL` and `LESSON_NOTE_ARTIFACT_STORE_URL` are configured.
- `/api/admin/learning/notes/jobs` lets scoped learning-ops reviewers/admins list and queue generation jobs with audit events.
- Actual approved note documents still require configured provider/storage services plus reviewer approval/publication; generated worker output stops at `ready_for_review`.

## Coverage Report

- `npm run coverage:learning`
- Output: `content/reports/cwit-r23-learning-coverage.json`
- The report covers both target programmes and all six semesters per programme.
- CIOT Semester 3-6 manifests are explicit empty draft blockers with `verificationStatus: needs_official_source`; they do not publish or imply subject placement.
- COMP Semester 1-6 and CIOT Semester 1-2 currently have structure-verified manifests.
- 51 current subject structures have official course outcomes promoted from official PDF text, but this does not create lessons or publishable notes/resources by itself.
- The admin coverage dashboard shows top-level official outcome coverage, unit coverage and YouTube review-queue readiness from the report.
- The report consumes the link-health report when present and rolls up matching candidate URL health by programme/semester.
- The report consumes the YouTube candidate review queue when present and rolls up mapping readiness/blockers.
- The report consumes the official timetable evidence report when present and rolls up code appearances separately from publishable manifests.
- The report consumes the official course catalog report when present and rolls up source-backed course identity separately from semester placement.
- The report consumes the official unit candidate review queue when present and rolls up unit-promotion readiness separately from promoted unit coverage.
- Lesson/resource coverage remains zero until lessons, approved PDFs and published `LessonResource` mappings exist in reviewed data.
- Authority-scoped view: `/admin/learning/coverage`.
- Authority-scoped review queues: `/admin/learning/unit-candidates`, `/admin/learning/course-catalog`, `/admin/resources/youtube-candidates` and `/admin/resources/queue`.
- `/admin/resources/queue` now includes governed lesson-resource mapping controls. A reviewer can save a draft mapping or approve a `LessonResource` only when the resource and lesson share the same authorized subject; approval requires reviewer evidence and an approved/verified/clear resource.

## Candidate Import Requirements

The import pipeline must preserve:

- source document name;
- source page;
- original subject section;
- original role label such as primary, alternate or practical;
- canonical URL;
- video ID or playlist ID;
- programme, semester, subject, unit and lesson mapping when verified;
- metadata check status and timestamp.

## Publication Rules

- PDF links are candidate resources, not verified resources.
- A resource is not student-published until metadata, syllabus fit and reviewer approval pass.
- Student-visible resource checks are centralized in `src/lib/resources/student-publication-policy.ts`.
- Normal students can see only clear, verified, non-archived resources with `public` or `published` visibility through approved/published lesson-resource mappings.
- Generated documents without an approved output resource need a usable HTML/PDF storage key before they can appear in lesson studio data.
- Generated notes must record curriculum sources, source video IDs, transcript/caption hash when used, template version, AI model/provider metadata, validation result, reviewer and published resource ID.
- Full transcripts must not be copied into notes.

## Missing Workflow

Required additions:

- YouTube Data API verification when credentials are available.
- Database-backed stale-resource queue and reviewer actions from coverage gaps.
- Lesson-level mapping review screen.
- Coverage dashboard for lessons with no primary video, no notes, no practice and broken links.
