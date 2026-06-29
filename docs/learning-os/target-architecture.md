# Lernio Learning OS Target Architecture

## Principles

- Official CWIT R23 documents are the final authority for curriculum publication.
- Gemini research and curated YouTube PDFs are planning and candidate-resource inputs only.
- Student data access is scoped server-side by user, programme, scheme, semester, publication status and archived state.
- AI-generated content never publishes directly to students.
- YouTube videos remain linked or embedded through approved privacy-preserving URLs; Lernio does not download or rehost videos.

## Domain Layers

1. Academic scope service
   - `getStudentLearningScope(userId)` resolves institution, department, programme, active R23 scheme, semester, class/division, subjects, electives and preview permissions.
   - It is server-only and is the single dependency for dashboard, learn, practice, revision, exams, materials, search and LEO.

2. Published curriculum service
   - Loads semester, subject, unit, topic and lesson summaries from official-source-backed manifests.
   - Separates cacheable published curriculum from private user progress.

3. Lesson studio
   - Adds `LessonResource` for ordered resources by role: `primary_video`, `alternate_video`, `lesson_notes`, `transcript`, `infographic`, `worksheet`, `formula_sheet`, `lab_demo`, `reference`.
   - Adds video chapters, watch progress, completion criteria, generated document provenance and content-generation jobs.
   - Uses `LessonNoteDocumentSchema` as the generated-notes contract before reviewer preview/PDF generation.

4. Resource governance
   - Imports candidate resources in dry-run mode.
   - Canonicalizes YouTube URLs by video/playlist ID.
   - Verifies metadata through API credentials or lawful public metadata.
   - Routes mappings and generated documents through reviewer/admin approval with audit events.
   - Renders approved note JSON through deterministic escaped HTML before print/PDF conversion.
   - Emits machine-readable coverage reports for missing manifests, unpublished candidates, missing videos, missing notes, missing practice and broken links.

5. Learning routes and shell
   - `/learn` resolves current scope and redirects to the student's current semester.
   - Canonical route tree:
     - `/learn/[programmeCode]/semester/[semesterNumber]`
     - `/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]`
     - `/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/unit/[unitNumber]`
     - `/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/lesson/[lessonSlug]`
   - Shared app shell remains reusable, but learning content is server-routed.

6. Progress and analytics
   - Track opened lessons, video position, read sections, modes completed, practice attempts, quiz results, downloads, bookmarks, completion and mastery separately.
   - XP uses existing idempotent ledger only after scoped validation and completion criteria.

7. Search
   - `/api/search/learning` is private/no-store and uses `getStudentLearningScope()`.
   - Results include current-semester subjects, units, topics, published lessons and approved resources only.
   - Command palette results route through canonical Learn URLs instead of client-only Zustand state.

8. LEO grounding
   - LEO retrieval is scoped through `getStudentLearningScope()`.
   - Retrieved context includes published/verified lesson mode content plus student-visible approved lesson resources, approved generated documents and verified/approved video chapter snippets.
   - Draft, unreviewed, private or archived resources and generated documents are excluded by the same publication policy used by Lesson Studio.

## Data Model Additions

Minimum additions:

- `LessonResource`
- `VideoChapter`
- `VideoWatchProgress`
- `GeneratedLessonDocument`
- `ContentGenerationJob`
- `LessonCompletionCriteria`

Existing models to preserve:

- `Resource`
- `ResourceTopicMapping`
- `Lesson`
- `LessonCompletion`
- authority, review and audit tables

## Caching

- Published curriculum: cacheable with tags such as `curriculum:CWIT:R23:DCOMP:S2`.
- Personal progress/dashboard: private, `no-store`.
- Review/admin queues: private, paginated, `no-store`.

## Security Boundaries

- Every subject, unit, topic, lesson, resource and progress write validates against the active scope or role preview authority.
- Draft, rejected, held, private or unreviewed content is hidden from normal students.
- Embedded providers use an allowlist and restrictive CSP.
- Rendered HTML/Markdown notes are sanitized.
