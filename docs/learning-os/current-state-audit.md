# Lernio Learning OS Current-State Audit

Date: 2026-06-28

## Scope Inspected

- Repository structure, scripts, Prisma schema and migrations.
- Student routes: dashboard, learn, practice, revision, exams, labs, coding, materials, planner, analytics, tutor, profile.
- Bootstrap and academics API flow.
- Department/programme selectors in signup and complete-profile.
- Learn view, dashboard view, client app shell, Zustand store.
- Resource governance, syllabus source registry, LEO retrieval, progress and materials APIs.
- Seed scripts, source registry data, tests, and supplied source inputs.

## Source Inputs

- `content-import/LERNIO_Full_Learning_System_Implementation_Prompt.md`
- `content-import/CWIT_Semester_1_2_YouTube_Lecture_Links.pdf`
- `content-import/CWIT_Semester_3_to_6_YouTube_Lecture_Links.pdf`
- `content-import/Pasted text(2).txt`
- Official CWIT pages found during audit:
  - Computer Engineering department page: `https://cwit.mespune.org/department/computer-engineering/`
  - Computer Engineering R23 curriculum PDF: `https://cwit.mespune.org/wp-content/uploads/2021/07/COMPUTER-MPECS-23-CURRICULUM.pdf`
  - Computer Engineering R23 structure PDF: `https://cwit.mespune.org/wp-content/uploads/2021/07/DCP_SEM-1_R23.pdf`
  - Computer Engineering and IoT department page: `https://cwit.mespune.org/department/department-of-computer-engineering-iot/`
  - Computer Engineering and IoT R23 curriculum PDF: `https://cwit.mespune.org/wp-content/uploads/2023/07/IOTR23_ALL_Curriculam-FINALV.pdf`
  - Computer Engineering and IoT R23 structure PDF: `https://cwit.mespune.org/wp-content/uploads/2023/07/DCI_SEM-1_R23.pdf`

## Confirmed Repository Reality

- Next.js App Router, React 19, TypeScript, Tailwind, Prisma/PostgreSQL, NextAuth, Groq AI, Vitest and Playwright are present.
- `src/app/learn/page.tsx` delegates to `RouteViewPage`, which renders `LearningApp`.
- `src/components/views/learn.tsx` is 2,435 lines and handles subject selection, unit/topic browsing and lesson view in one client component.
- `src/components/views/dashboard.tsx` is 568 lines and already contains progress, XP, streak, continue-learning, revision, planner and achievement widgets.
- `src/components/app/learning-app.tsx` lazy-loads non-dashboard views and keeps route/view identity in the client shell.
- `src/store/app-store.ts` keeps learn context and continue-learning in Zustand, but persistence is disabled through `partialize: () => ({})`.
- Prisma already contains the academic hierarchy, syllabus source registry, import jobs, resource governance, authority, reviews, audit events, lessons, questions and progress tables.
- LEO retrieval in `src/lib/ai/retrieval.ts` pulls real `Lesson` rows with `published` or `verified` status, but it is not yet constrained by the requesting student's programme/semester scope.

## Critical Findings

1. Programme and semester scoping is not enforced in bootstrap.
   - `src/lib/app-bootstrap.ts#getSubjects()` loads all subjects with no user programme, scheme, semester, status or archive filter.
   - Dashboard progress queries load all user progress and join arbitrary lesson/topic/subject rows.

2. `/api/academics` is institution-scoped, not student-scope scoped.
   - `src/app/api/academics/route.ts` allows `PUBLIC` and verified institution membership, then returns all matching institution subjects.
   - It does not filter by `User.departmentCode`, programme, active scheme, current semester, subject applicability, archived rows, or publication status beyond lesson status.

3. Student selectors expose too many departments.
   - `src/lib/cwit-departments.ts` includes CIVIL, ELEC, ENTC, MECH and SH alongside COMP and CIOT.
   - `CWIT_PROGRAMMES` derives from that full list, so signup, complete-profile and profile views can offer non-target programmes.

4. The demo seed is not an R23 six-semester curriculum.
   - `scripts/seed.ts` is destructive and centered on `ACTIVE_DEPARTMENT_CODE = "COMP"`, `ACTIVE_PROGRAMME_CODE = "DCOMP"`, Semester 3.
   - It uses generic codes such as `CS201`, not official R23 CP/CI course codes.

5. Lesson resources are not first-class.
   - Prisma has `ResourceTopicMapping`, but no `LessonResource` join for ordered primary videos, alternate videos, notes, transcripts, worksheets, infographics or formula sheets.
   - No typed generated-document provenance, video watch progress, chapter/timestamp or completion-criteria model exists yet.

6. Canonical learning routes do not exist.
   - Only `/learn` exists. There are no `/learn/[programmeCode]/semester/[semesterNumber]`, subject, unit or lesson routes.
   - Refresh, deep-link and sharing behavior still depend on client state.

7. Materials and progress APIs have IDOR/scoping gaps.
   - `src/app/api/materials/route.ts` accepts `subjectId` and returns public resources without checking that the subject is in the user's programme/semester.
   - `src/app/api/progress/lesson/route.ts` checks only that a lesson exists before writing progress and XP.

8. Resource governance exists but needs curriculum mapping depth.
   - `src/lib/resources/resource-governance.ts` supports provider policy and resource review, but review queue only shows subject and topic mapping counts.
   - It does not yet expose lesson-level role/order, YouTube metadata, link-health workflow, transcript/notes provenance or coverage gaps.

9. Syllabus source registry exists but hierarchy loading is broad.
   - `src/app/admin/syllabus/sources/page.tsx` lists all departments/programmes/schemes for admin source registration.
   - That is acceptable for admins, but normal student flows need separate scoped product selectors.

10. PDF extraction is available, visual rendering is not.
   - `pdfplumber` and `pypdf` are installed.
   - `pdftoppm` is not installed. Use `pypdfium2` as the local fallback for visual PDF page rendering when Poppler is unavailable.

## Supplied Resource Extraction

- `CWIT_Semester_1_2_YouTube_Lecture_Links.pdf`: 16 pages, 38 unique YouTube URLs extracted.
- `CWIT_Semester_3_to_6_YouTube_Lecture_Links.pdf`: 26 pages, 65 unique YouTube URLs extracted.
- `npm run content:import:youtube-guides -- --sem12 content-import/CWIT_Semester_1_2_YouTube_Lecture_Links.pdf --sem36 content-import/CWIT_Semester_3_to_6_YouTube_Lecture_Links.pdf --dry-run` extracts directly from the source PDFs.
- Write mode stores extracted text and URL manifests in ignored `tmp/pdfs/`.
- The PDFs are subject/page oriented. They provide source page and subject labels, but most mappings still need official lesson/unit alignment before student publication.

## File-by-File Implementation Map

| Area | Current files | Required action |
|---|---|---|
| Department registry | `src/lib/cwit-departments.ts`, `src/lib/campus-auth.ts` | Keep full CWIT registry for archival/admin reference, expose only COMP/CIOT as active student products. |
| Onboarding | `src/app/sign-up/page.tsx`, `src/app/complete-profile/*`, `src/lib/campus-registration.ts` | Ensure selectors and fallbacks reject non-target archived programmes. |
| Department scripts | `scripts/upsert-cwit-departments.ts` | Stop reactivating archived departments; add dry-run/write archive scope script. |
| Bootstrap | `src/lib/app-bootstrap.ts`, `src/lib/app-bootstrap-types.ts` | Replace unscoped subject query with `getStudentLearningScope()`. |
| Academics API | `src/app/api/academics/route.ts` | Enforce programme, semester, scheme, status, archive and role-preview checks server-side. |
| Learn routing | `src/app/learn/**`, `src/components/views/learn.tsx`, `src/components/app/learning-app.tsx` | Add canonical server routes and decompose feature modules under `src/features/learning`. |
| Dashboard | `src/components/views/dashboard.tsx`, `src/lib/app-bootstrap.ts` | Center current semester journey, progress and next lessons from scoped queries. |
| Schema | `prisma/schema.prisma`, `prisma/migrations/**` | Add lesson-resource, video progress, generated document provenance, content job, completion criteria and indexes. |
| Curriculum | `scripts/seed.ts`, new `content/curriculum/cwit-r23/**` | Replace generic destructive seed as source of truth with validated manifests and idempotent import. |
| Resources | `src/lib/resources/**`, `src/app/admin/resources/**`, new import scripts | Import/deduplicate YouTube candidates, map to lessons, verify metadata, review and publish. |
| LEO | `src/lib/ai/retrieval.ts`, `src/app/api/tutor/chat/route.ts` | Restrict retrieval to approved scoped curriculum and later include approved notes/resources. |
| Practice/revision/exams/labs/coding/materials | `src/components/views/*`, `src/app/api/*` | Default to current semester and validate all IDs against user scope. |
| Tests | `src/lib/*.test.ts`, `tests/e2e/**` | Add unit, integration, e2e, accessibility and visual coverage for scope isolation and learning routes. |

## Immediate Phase Order

1. Phase 1: expose only COMP/DCOMP and CIOT/DCIOT; add safe archive script.
2. Phase 2: add server-only student learning scope and use it in bootstrap/API filters.
3. Phase 3: add lesson-resource and content provenance schema.
4. Phase 4: build official-source-backed curriculum manifests and validation.
5. Phase 5+: canonical learning routes, dashboard redesign, imports, notes pipeline and integrations.
