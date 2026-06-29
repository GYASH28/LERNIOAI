# Route and Component Map

## Current Routes

| Route | Component path | Current behavior |
|---|---|---|
| `/dashboard` | `src/app/dashboard/page.tsx` -> `RouteViewPage` -> `LearningApp` -> `DashboardView` | Server bootstrap plus client dashboard widgets. |
| `/learn` | `src/app/learn/page.tsx` -> `getStudentLearningScope` -> canonical semester redirect, fallback `RouteViewPage` | Resolves signed-in students to their current programme/semester route when scope is available; keeps the old client shell as fallback for unresolved scope/demo/database edge cases. |
| `/learn/[programmeCode]/semester/[semesterNumber]` | `src/app/learn/[programmeCode]/semester/[semesterNumber]/page.tsx` -> `getSemesterOverview` | Server-rendered, scoped semester overview foundation. |
| `/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]` | `src/app/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/page.tsx` -> `getSubjectOverview` | Server-rendered, scoped subject overview foundation. |
| `/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/unit/[unitNumber]` | `src/app/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/unit/[unitNumber]/page.tsx` -> `getUnitOverview` | Server-rendered, scoped unit route with topic summary and lesson links. |
| `/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/lesson/[lessonSlug]` | `src/app/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/lesson/[lessonSlug]/page.tsx` -> `getLessonStudio` | Server-rendered, scoped lesson studio foundation with curriculum rail, approved resources, notes, mode content and previous/next navigation. |
| `/practice` | `src/app/practice/page.tsx` -> `RouteViewPage` | Client view backed by scoped question/progress APIs. |
| `/revision` | `src/app/revision/page.tsx` -> `RouteViewPage` | Client view backed by scoped revision APIs; not yet curriculum-route linked. |
| `/exams` | `src/app/exams/page.tsx` -> `RouteViewPage` | Client view backed by scoped paper/question/attempt APIs. |
| `/labs` | `src/app/labs/page.tsx` -> `RouteViewPage` | Client lab views, not yet attached to official lesson/practical mapping. |
| `/coding` | `src/app/coding/page.tsx` -> `RouteViewPage` | Coding view, needs lesson linkage for programming courses. |
| `/materials` | `src/app/materials/page.tsx` -> `RouteViewPage` | Materials library backed by scoped material APIs. |
| `/planner` | `src/app/planner/page.tsx` -> `RouteViewPage` | Planner view backed by scoped task and auto-plan APIs. |
| `/tutor` | `src/app/tutor/page.tsx` -> `RouteViewPage` | LEO context and retrieval are constrained by current learning scope. |
| `/profile` | `src/app/profile/page.tsx` -> `RouteViewPage` | Shows department cards from static registry. |

## Student APIs

| Route | Current behavior |
|---|---|
| `/api/search/learning?q=...` | Authenticated, private/no-store scoped search across the student's current semester, subjects, units, topics, published lessons and approved resources. Results return canonical Learn/materials hrefs and never include draft resources. |

## Admin/Reviewer Routes

| Route | Current behavior |
|---|---|
| `/admin/syllabus/sources` | Registers official/internal syllabus sources. |
| `/admin/syllabus/imports` | Import queue shell exists. |
| `/admin/resources/queue` | Resource provider and review queue shell exists. |
| `/admin/learning/coverage` | Read-only Learning OS coverage dashboard backed by `content/reports/cwit-r23-learning-coverage.json`. |
| `/admin/learning/course-catalog` | Read-only official course catalog review backed by `content/curriculum/cwit-r23/extraction-reports/official-course-catalog.json`; highlights unplaced official courses without assigning semesters. |
| `/admin/learning/unit-candidates` | Read-only official unit candidate review queue backed by `content/curriculum/cwit-r23/extraction-reports/official-unit-candidate-review-queue.json`. |
| `/admin/learning/notes` | Lists valid generated note JSON files under `content/lesson-notes`. |
| `/admin/learning/notes/[noteSlug]` | Reviewer/admin preview for validated note JSON rendered through `renderLessonNoteHtml()`. |
| `/admin/learning/notes/[noteSlug]/print` | Private no-store raw print HTML endpoint for Playwright/PDF rendering. |
| `/admin`, `/coordinator`, `/teacher`, `/reviewer`, `/moderator`, `/cr` | Protected workspaces through authority layer. |

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
