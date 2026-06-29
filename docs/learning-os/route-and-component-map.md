# Route and Component Map

## Current Routes

| Route | Component path | Current behavior |
|---|---|---|
| `/dashboard` | `src/app/dashboard/page.tsx` -> `RouteViewPage` -> `LearningApp` -> `DashboardView` | Server bootstrap plus client dashboard widgets. |
| `/learn` | `src/app/learn/page.tsx` -> `getStudentLearningScope` -> canonical semester redirect, fallback `RouteViewPage` | Resolves signed-in students to their current programme/semester route when scope is available; keeps the old client shell as fallback for unresolved scope/demo/database edge cases. |
| `/learn/[programmeCode]/semester/[semesterNumber]` | `src/app/learn/[programmeCode]/semester/[semesterNumber]/page.tsx` -> `getSemesterOverview` | Server-rendered, scoped semester overview foundation. |
| `/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]` | `src/app/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/page.tsx` -> `getSubjectOverview` | Server-rendered, scoped subject overview foundation. |
| `/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/unit/[unitNumber]` | `src/app/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/unit/[unitNumber]/page.tsx` -> `getUnitOverview` | Server-rendered, scoped unit route with topic summary and lesson links. |
| `/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/lesson/[lessonSlug]` | `src/app/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/lesson/[lessonSlug]/page.tsx` -> `getLessonStudio` | Server-rendered, scoped lesson studio foundation with curriculum rail, approved resources, generated-note delivery links, mode content, previous/next navigation and a handoff to lesson-filtered Materials. Generated note object keys are not exposed to the page. |
| `/practice` | `src/app/practice/page.tsx` -> `RouteViewPage` | Client view backed by scoped question/progress APIs. |
| `/revision` | `src/app/revision/page.tsx` -> `RouteViewPage` | Client view backed by scoped revision APIs, with source lesson links on due items and flashcards when a scoped lesson exists. |
| `/exams` | `src/app/exams/page.tsx` -> `RouteViewPage` | Client view backed by scoped paper/question/attempt APIs. |
| `/labs` | `src/app/labs/page.tsx` -> `RouteViewPage` | Client lab views, integrating `/api/labs` to list official practical experiments or display blocker messages. |
| `/coding` | `src/app/coding/page.tsx` -> `RouteViewPage` | Coding view backed by scoped `/api/coding`; global published practice remains visible and optional subject/unit/topic/lesson-linked challenges are filtered to the student's learning scope. Submit uses a trusted remote runner when configured, falls back to manual-review saving when unavailable, and hides expected test values from the browser. Reviewed challenge imports/mappings and deployed runner credentials remain pending. |
| `/materials` | `src/app/materials/page.tsx` -> `RouteViewPage` | Materials library backed by scoped material APIs, including optional `lessonId` filtering through approved `LessonResource` mappings. |
| `/planner` | `src/app/planner/page.tsx` -> `RouteViewPage` | Planner view backed by scoped task and auto-plan APIs, including lesson-backed tasks with canonical Learn links and source reasons. |
| `/tutor` | `src/app/tutor/page.tsx` -> `RouteViewPage` | LEO context and retrieval are constrained by current learning scope. |
| `/profile` | `src/app/profile/page.tsx` -> `RouteViewPage` | Shows department cards from static registry. |

## Student APIs

| Route | Current behavior |
|---|---|
| `/api/search/learning?q=...` | Authenticated, private/no-store scoped search across the student's current semester, subjects, units, topics, published lessons and approved resources. Results return canonical Learn/materials hrefs and never include draft resources. |
| `/api/labs` | Scoped API returning current student scope, published/verified PracticalExperiment rows, and blocker states. |
| `/api/learning/notes/[documentId]` | Authenticated generated-note delivery route. It verifies the document is student-visible and belongs to the caller's current scoped lessons, then redirects to a signed HTML/PDF artifact URL or an approved output resource URL. |

## Admin/Reviewer Routes

| Route | Current behavior |
|---|---|
| `/admin/syllabus/sources` | Registers official/internal syllabus sources. |
| `/admin/syllabus/imports` | Import queue shell exists. |
| `/admin/resources/queue` | Authority-scoped resource review queue; provider policy writes remain admin-only and resource decisions require resource review/publish capability. Reviewers can also draft or approve scoped `LessonResource` mappings with governed roles and reviewer evidence. |
| `/admin/learning/coverage` | Authority-scoped Learning OS coverage dashboard backed by `content/reports/cwit-r23-learning-coverage.json`. |
| `/admin/learning/course-catalog` | Authority-scoped official course catalog review backed by `content/curriculum/cwit-r23/extraction-reports/official-course-catalog.json`; highlights unplaced official courses without assigning semesters. |
| `/admin/learning/unit-candidates` | Authority-scoped official unit candidate review queue backed by `content/curriculum/cwit-r23/extraction-reports/official-unit-candidate-review-queue.json`. |
| `/admin/learning/notes` | Authority-scoped list of valid generated note JSON files under `content/lesson-notes`. |
| `/admin/learning/notes/[noteSlug]` | Scoped reviewer/admin preview for validated note JSON rendered through `renderLessonNoteHtml()`; out-of-scope slugs return 404. |
| `/admin/learning/notes/[noteSlug]/print` | Scoped private no-store raw print HTML endpoint for Playwright/PDF rendering. |
| `/api/admin/learning/notes/jobs` | Authority-scoped API for listing and queueing lesson-note generation jobs. Queue writes require `ai.content_draft`, `ai.content_review` or admin authority, validate lesson subject scope, reuse active jobs unless `forceNew` is requested and audit `lesson_note.generation_queued`. |
| `/admin`, `/coordinator`, `/teacher`, `/reviewer`, `/moderator`, `/cr` | Protected workspaces through authority layer; teacher/coordinator/reviewer dashboards link into scoped Learning OS previews where applicable. |

## Target Learning Components

Create:

```text
src/features/learning/
  server/
    get-student-learning-scope.ts
    get-semester-overview.ts
    get-subject-overview.ts
    get-unit-overview.ts
    get-lesson-studio.ts
  components/
    semester/
    subject/
    unit/
    lesson/
    video/
    notes/
    progress/
  schemas/
  types/
  utils/
```

Migration rule:

- Do not keep expanding `src/components/views/learn.tsx`.
- Move UI by route boundary, starting with semester and subject summary pages.
- Keep compatibility for `/learn` while canonical routes are introduced.
- Lesson route slugs are generated from readable lesson titles plus the stable lesson id suffix until a persisted `Lesson.slug` column is introduced.
- The command palette now keeps its static navigation/actions but queries `/api/search/learning` while open so curriculum search respects server scope and publication status.
