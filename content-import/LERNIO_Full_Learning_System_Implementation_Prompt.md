# LERNIO AI 2.0 - MASTER LEARNING SYSTEM IMPLEMENTATION PROMPT

## Role

Act as a senior staff software engineer, product architect, database architect, curriculum systems designer, learning-experience designer, AI content-pipeline engineer, accessibility specialist, and QA lead working directly inside the existing repository:

- Repository: `https://github.com/GYASH28/LERNIOAI.git`
- Default branch: `main`
- Product: Lernio AI 2.0 for CWIT Pune diploma students

Do not treat this as a greenfield mock-up. First inspect the complete repository, database schema, migrations, routes, APIs, role/authority system, seed scripts, tests, UI components, and existing learning workflows. Preserve strong existing systems and refactor weak ones instead of replacing everything blindly.

The final product must make Lernio's Learning section the centre of the student experience. A student in either Computer Engineering or Computer Engineering & IoT should be able to open Lernio, see their exact semester, follow the official curriculum lesson by lesson, watch curated lectures inside the platform, read excellent lesson notes, practise, revise, ask LEO questions with grounded context, and track progress without needing to search elsewhere.

---

# 1. INPUTS AND SOURCE MATERIAL

Use these inputs together:

1. The current LERNIOAI repository.
2. `CWIT_Semester_1_2_YouTube_Lecture_Links.pdf`
3. `CWIT_Semester_3_to_6_YouTube_Lecture_Links.pdf`
4. `Pasted text(2).txt`, containing Gemini's CWIT curriculum and resource research.
5. Official CWIT/MSBTE R23 curriculum PDFs, schemes, amendments, assessment structures, lab manuals, timetables, and verified internal documents already registered or later added through Lernio's syllabus source registry.

## Source-of-truth hierarchy

Use this priority order whenever sources disagree:

1. Official CWIT R23 curriculum or official amendment.
2. Official CWIT department document, assessment scheme, timetable, lab manual, or verified institutional source.
3. Verified teacher/reviewer input.
4. The two curated YouTube-link PDFs.
5. Gemini research as a planning aid only.
6. Older R18 documents only for clearly labelled historical comparison or temporary draft mapping.

Never invent subject codes, semester placement, units, topics, marks, credits, URLs, timestamps, or course outcomes. Any uncertain information must remain `draft`, `pending_verification`, or `needs_official_source` and must not silently appear as verified student content.

The Gemini research indicates that advanced-semester placement and some codes require manual verification. Treat that warning seriously. Use official documents to verify Semesters 3-6 before publishing them.

---

# 2. CURRENT REPOSITORY REALITY TO RESPECT

Before changing code, verify these current architectural facts in the repository:

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui/Radix, Prisma 6, PostgreSQL, NextAuth, Groq-backed AI, Framer Motion, Recharts, Vitest, and Playwright are already present.
- `src/app/learn/page.tsx` currently delegates to `RouteViewPage`, which loads the client-side `LearningApp` shell.
- `src/components/views/learn.tsx` is a very large monolithic learning view with three stages: subject selection, unit/topic browser, and lesson view.
- The lesson UI already supports five modes: Learn, Simplify, Visualise, Practise, and Revise.
- `src/components/views/dashboard.tsx` already contains progress, continue-learning, XP, streak, revision, activity, planner, and achievement widgets.
- Prisma already contains Institution, Department, Programme, AcademicScheme, Semester, Subject, Unit, Topic, Lesson, Resource, ResourceTopicMapping, CourseOutcome, PracticalExperiment, Question, progress, authority, review, and audit models.
- The Resource model already supports `pdf`, `video_link`, `web_link`, lab manuals, question papers, metadata, provider, canonical URL, external ID, thumbnail, duration, link health, quality score, source trust, review status, and moderation status.
- Admin syllabus source registration and resource review queues already exist.
- LEO already retrieves real published/verified Lesson rows for grounded answers.

Do not throw these foundations away. Extend them cleanly.

## Known foundational problems to fix

1. `getSubjects()` in `src/lib/app-bootstrap.ts` currently loads all subjects instead of filtering by the signed-in student's programme, scheme, and semester.
2. `/api/academics` filters primarily by institution access, not by exact student programme/semester/applicability.
3. The current seed is centred on Computer Engineering Semester 3 and uses generic subject codes such as `CS201`, not a complete two-programme six-semester R23 dataset.
4. Lesson records contain five JSON content fields but no first-class, ordered relationship to primary video, alternate video, notes PDF, transcript, worksheet, infographic, or formula sheet.
5. `src/lib/cwit-departments.ts` exposes many departments, while this product must expose only Computer Engineering and Computer Engineering & IoT.
6. The Learn view is too large and client-heavy; it should be decomposed into route-aware server and client features.
7. The current student dashboard is generally useful but not built around the student's exact semester learning journey.
8. Continue-learning state is not reliably persisted across devices and sessions.
9. The initial bootstrap sends too much academic hierarchy at once and does not provide a scalable six-semester content-loading strategy.

---

# 3. NON-NEGOTIABLE PRODUCT RULES

1. Only these two departments/programmes may be active, selectable, and visible in the student product:
   - `COMP` / `DCOMP` - Diploma in Computer Engineering
   - `CIOT` / `DCIOT` - Diploma in Computer Engineering & IoT

2. Do not destructively delete historical rows, users, audit events, contributions, or relationships belonging to other departments. Archive and hide them through a migration. Hard deletion is allowed only inside an explicitly destructive local demo reset.

3. Shared first-year foundation subjects must remain available to both target programmes even after Science & Humanities is no longer a selectable department. Model them as shared programme offerings rather than losing them.

4. Every student must see only the subjects applicable to their programme, R23 scheme, and current semester. Teachers, coordinators, reviewers, and admins may receive broader scoped access based on existing authority rules.

5. Do not fabricate or silently substitute curriculum information.

6. Do not download or rehost YouTube videos. Use privacy-enhanced embeds, approved metadata, captions/transcripts when legally available, and deep links as fallback.

7. Generated notes must be original instructional material, not copied transcripts. Preserve source provenance and citations.

8. AI-generated content must never auto-publish directly to students. It must pass validation and the existing reviewer/admin publication workflow.

9. Learning should dominate the UX, but existing useful systems such as Practice, Revision, Exams, Labs, Coding, Planner, Materials, Analytics, and LEO should be integrated around the curriculum rather than removed blindly.

10. Mobile, accessibility, low-bandwidth use, performance, security, and reduced-motion support are required, not optional polishing.

---

# 4. EXECUTION METHOD

Work in phases. Do not start by redesigning random cards. First make the academic scope and data model correct.

For every phase:

- Inspect all related files first.
- Write or update architecture documentation.
- Make migration-safe, typed changes.
- Add automated tests.
- Run lint, typecheck, unit tests, build, and relevant Playwright tests.
- Report assumptions and unresolved verification items honestly.
- Use small, reviewable commits or PR-sized change groups.

Do not ask broad questions that can be answered by inspecting the repository or source documents. Make sensible decisions, record assumptions, and proceed. Stop only for a true external blocker such as unavailable credentials or a missing official source that would make publication unsafe.

---

# 5. PHASE 0 - COMPLETE AUDIT BEFORE IMPLEMENTATION

Create these documents before major coding:

- `docs/learning-os/current-state-audit.md`
- `docs/learning-os/target-architecture.md`
- `docs/learning-os/route-and-component-map.md`
- `docs/learning-os/curriculum-coverage-matrix.md`
- `docs/learning-os/resource-and-content-provenance.md`
- `docs/learning-os/data-migration-plan.md`
- `docs/learning-os/testing-and-release-plan.md`

The audit must cover:

- All student-facing routes and views.
- Bootstrap and academic data flow.
- Prisma academic hierarchy and missing relations.
- Seed scripts and demo fixtures.
- Department/programme/profile selectors.
- Lesson rendering and five learning modes.
- Progress, mastery, revision, practice, exams, labs, and coding integration.
- Materials and resource governance.
- AI retrieval and citation flow.
- Admin/reviewer workflows.
- Current test coverage.
- Performance risks, especially the large `learn.tsx` client bundle.
- Migration and deployment risks.

Include a file-by-file implementation map, not only a conceptual document.

---

# 6. PHASE 1 - LIMIT THE PRODUCT TO THE TWO PROGRAMMES SAFELY

## Required changes

Update the active department/programme source and every dependent selector so only COMP and CIOT are offered to new users.

Inspect and update at least:

- `src/lib/cwit-departments.ts`
- `src/lib/campus-auth.ts`
- `src/app/complete-profile/page.tsx`
- `src/app/complete-profile/complete-profile-form.tsx`
- profile/settings forms
- signup/onboarding flows
- admin hierarchy selectors where appropriate
- demo fixtures
- `scripts/upsert-cwit-departments.ts`
- seed scripts and tests

## Safe archival migration

Create a migration/script that:

- Keeps COMP and CIOT active.
- Marks CIVIL, ELEC, ENTC, MECH, SH, and any other non-target department/programme as archived/inactive for this Lernio deployment.
- Sets `archivedAt` where available.
- Prevents new student selection and new active class creation for archived programmes.
- Preserves existing rows and audit history.
- Produces a dry-run report of affected departments, programmes, users, schemes, classes, and role assignments before write mode.
- Does not break shared first-year curriculum applicability.

Provide commands such as:

```bash
npm run db:departments:scope -- --dry-run
npm run db:departments:scope -- --write
```

Make this idempotent.

---

# 7. PHASE 2 - BUILD THE CORRECT STUDENT LEARNING SCOPE

Create a server-only domain service, for example:

```ts
getStudentLearningScope(userId)
```

It must resolve:

- institution
- department
- programme
- active/published academic scheme
- semester number
- division/class group where relevant
- applicable subjects
- electives selected or available
- content publication status
- role-based preview permissions

Use programme and semester scoping at the database query, not only client-side filtering.

## Required behaviour

- A COMP Semester 2 student must receive only COMP Semester 2 subjects and shared Semester 2 offerings.
- A CIOT Semester 2 student must additionally receive BEEE and must not receive COMP-only subjects.
- Semester switching for normal students may show other semesters in preview/read-only mode only if the product policy allows it; their current semester must remain the default.
- Teachers/reviewers can preview assigned or scoped curriculum.
- Admins can inspect all drafts.
- Archived departments and inactive schemes must never leak into normal student responses.

## Fix these flows

- `src/lib/app-bootstrap.ts`
- `/api/academics`
- dashboard bootstrap
- Learn page loaders
- Practice/Revision/Exams/Materials filters
- LEO context resolution
- any command palette or search results

Split static curriculum data from user-specific progress so it can be cached safely. Use private/no-store responses for personal progress and cache tags or revalidation for published curriculum.

Add tests for programme, semester, role, publication, and archived-data isolation.

---

# 8. PHASE 3 - EXTEND THE DATA MODEL FOR A COMPLETE LESSON STUDIO

Use the current Resource and ResourceTopicMapping foundation, but add an explicit many-to-many relation between lessons and resources.

A recommended shape is:

```prisma
model LessonResource {
  id                 String   @id @default(cuid())
  lessonId           String
  lesson             Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  resourceId         String
  resource           Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  role               String   // primary_video | alternate_video | lesson_notes | transcript | infographic | worksheet | formula_sheet | lab_demo | reference
  sortOrder          Int      @default(0)
  isPrimary          Boolean  @default(false)
  isRequired         Boolean  @default(false)
  startSeconds       Int?
  endSeconds         Int?
  coveragePercentage Int?
  verificationStatus String  @default("pending")
  status             String  @default("draft")
  sourceEvidence     String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([lessonId, resourceId, role])
  @@index([lessonId, role, status])
  @@index([resourceId])
}
```

Adjust names if the existing conventions suggest better names, but keep the capabilities.

Also add the minimum additional models needed for:

- YouTube chapters/timestamps.
- Video watch/resume progress per user.
- Generated document provenance and versioning.
- Content-generation jobs and failure states.
- Lesson completion criteria.
- Review/publication status.

A possible generated-document record should retain:

- lesson ID
- output Resource ID
- source video Resource IDs
- source transcript/caption hash
- curriculum source IDs
- template version
- AI provider/model metadata
- generation status
- validation results
- reviewer/publisher IDs
- generated timestamp
- storage object key
- page count
- content hash

Do not stuff all of this into unvalidated arbitrary JSON if typed columns or a small governed metadata schema would be safer.

## Compatibility

- Preserve existing Resource, Materials, Lesson, progress, and review behaviour.
- Backfill existing topic/unit resources where possible.
- Provide reversible migrations or documented rollback.
- Add indexes for the actual route queries.
- Keep all import/upsert scripts idempotent.

---

# 9. PHASE 4 - IMPORT THE COMPLETE TWO-PROGRAMME R23 CURRICULUM

Create a versioned, machine-readable curriculum manifest system. Do not continue expanding the destructive single-semester seed file as one giant source of truth.

Recommended structure:

```text
content/
  curriculum/
    cwit-r23/
      comp/
        semester-1.json
        semester-2.json
        ...
        semester-6.json
      ciot/
        semester-1.json
        ...
        semester-6.json
      schemas/
        curriculum.schema.json
  resources/
    youtube-candidates/
    lesson-notes/
```

Each curriculum record must carry:

- institution code
- department code
- programme code
- scheme code and revision
- semester number
- official subject code
- subject name
- category/type
- credits and hours when verified
- assessment metadata
- units in official order
- topics in official order
- outcomes
- practical experiments
- official source references and page ranges
- `verificationStatus`
- `verifiedAt`
- `verifiedBy`

Create validation with Zod or JSON Schema and fail the import on duplicate codes, invalid semester references, missing source evidence, or malformed order.

## Starting curriculum map

Use the following as a starting index, then verify every item against official R23 documents before publishing.

### Semester 1 - shared content with programme-specific subject codes

- Basic Mathematics: `R23CP1701` / `R23CI1701`
- Basic Science: `R23CP2701` / `R23CI2701`
- Communication Skills: `R23CP1702` / `R23CI1702`
- Engineering Graphics: `R23CP2201` / `R23CI2201`
- Engineering Workshop Practice: `R23CP6401` / `R23CI6601`
- Fundamentals of ICT: `R23CP6402` / `R23CI6602`
- Yoga and Meditation: `R23CP4701` / `R23CI4701`

### Semester 2 - common and branch-specific

- Applied Mathematics: `R23CP1703` / `R23CI1703`
- Programming in C: `R23CP1401` / `R23CI1601`
- Linux Basics: `R23CP2401` / `R23CI2601`
- Web Page Designing: `R23CP6403` / `R23CI6603`
- Professional Communication: `R23CP6701` / `R23CI6701`
- Social and Life Skills: `R23CP4401` / `R23CI4601`
- CIOT-only Basic Electrical and Electronics Engineering: `R23CI1301`

### Advanced-semester candidates requiring official verification

- Data Structures: `R23CP2402` / `R23CI2602`
- Object Oriented Programming with C++: `R23CP6404` / `R23CI6604`
- COMP Microprocessors and Programming: `R23CP2403`
- CIOT Digital Techniques and Microcontrollers: code must be verified, never guessed
- COMP Computer Networks: `R23CP2408`
- CIOT Embedded OS: `R23CI2606`
- Software Engineering: `R23CP2409` / `R23CI2610`
- COMP Python Programming: verify whether the valid code is `R23CP1405`, `R23CP1406`, or another official code
- COMP Recent Trends in Computer Networks: `R23CP3401`

Do not assume the semester positions from this list. Parse and verify the official Semester 3-6 structure before publication.

## Shared content strategy

Maintain separate official Subject offerings when codes differ, but allow one verified Resource to attach to equivalent lessons in both programmes through the LessonResource join. This avoids duplicating the same video or notes while preserving exact programme codes.

---

# 10. PHASE 5 - CREATE INDIVIDUAL SEMESTER EXPERIENCES

Each semester needs its own canonical URL and data-driven experience, without copying six nearly identical page components.

Recommended routes:

```text
/learn
/learn/[programmeCode]/semester/[semesterNumber]
/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]
/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/unit/[unitNumber]
/learn/[programmeCode]/semester/[semesterNumber]/subject/[subjectCode]/lesson/[lessonSlug]
```

`/learn` should resolve the signed-in student's scope and redirect to their current programme and semester.

Use stable codes/slugs and server-side access checks. The URL, not only Zustand state, must identify the current semester, subject, unit, and lesson. Browser back/forward, bookmarking, sharing permitted links, refresh, and deep links must all work.

## Refactor strategy

Do not keep adding code to the 2,000+ line `src/components/views/learn.tsx`.

Extract a feature architecture similar to:

```text
src/features/learning/
  server/
    get-student-learning-scope.ts
    get-semester-overview.ts
    get-subject-overview.ts
    get-lesson-studio.ts
  components/
    semester/
    subject/
    lesson/
    video/
    notes/
    progress/
  schemas/
  types/
  utils/
```

Extract the common student shell from `LearningApp` so nested Learn routes can use the same Sidebar, TopBar, utility actions, theme, mascot, and footer without rendering the old view router inside every page.

Keep compatibility redirects from existing Learn links while migrating.

---

# 11. SEMESTER PAGE DESIGN

Every semester page must feel like a complete academic home, not a plain subject grid.

## Semester hero

Show:

- Programme name and code.
- Semester number and R23 revision.
- Current/past/future semester state.
- Overall semester completion.
- Today's recommended lesson.
- Continue-learning button.
- Exam countdown when configured.
- Estimated study time remaining.
- Resource readiness, such as `42/48 lessons fully equipped`.

## Main semester sections

1. **My Subjects**
   - Official curriculum order.
   - Exact subject code.
   - Theory/practical/elective/shared/branch-specific badges.
   - Unit and lesson counts.
   - Progress and mastery.
   - Number of videos, notes, quizzes, and practicals available.
   - Continue or Start action.

2. **Recommended Learning Path**
   - A week-by-week or adaptive lesson sequence.
   - Respects prerequisites, weak topics, exam proximity, and unfinished lessons.
   - Shows why a lesson is recommended.

3. **This Week**
   - Planned lessons.
   - Revision due.
   - Practical/lab work.
   - Upcoming tests and deadlines.

4. **Weak Topics and Recovery Plan**
   - Derived from real attempts and mastery records.
   - One-click focused review, practice, and LEO help.

5. **Semester Resources**
   - Official curriculum PDF.
   - Subject handbooks.
   - Formula sheets.
   - Lab manuals.
   - Question papers and model answers where approved.

6. **Semester Switcher**
   - All six semesters with status and progress.
   - Current semester prominent.
   - Other semesters clearly labelled current, completed, preview, or locked according to policy.

Each semester should have a subtle identity based on its learning stage, but do not create six disconnected visual systems. Use one design language with semester-specific content, accent, illustration, and emphasis.

---

# 12. SUBJECT PAGE DESIGN

A subject page must include:

- Subject title, exact code, credits/hours, category, and semester.
- Description and why the subject matters.
- Course outcomes and assessment pattern.
- Unit map in official order.
- Unit weightage and exam importance.
- Theory and practical separation where relevant.
- Prerequisites.
- Total lesson/video/notes/practice coverage.
- Subject progress, mastery, and estimated time remaining.
- Continue from last lesson.
- Unit-level notes and revision packs.
- Lab experiments with apparatus/software/procedure/safety/result rubric where applicable.
- Approved references and source evidence.
- Previous papers and model answers when available.
- Scoped Ask LEO action.

Use progress visuals, concept maps, and timelines meaningfully. Do not decorate with charts that carry no educational value.

---

# 13. LESSON PAGE - THE ALL-IN-ONE STUDY STUDIO

This is the most important screen in Lernio.

## Desktop layout

Use a responsive three-part structure where appropriate:

- Left: collapsible curriculum navigator showing subject, units, lessons, completion, and search.
- Centre: primary lesson content and video.
- Right: contextual tools such as lesson outline, notes, LEO, bookmarks, progress, and quick revision.

On tablets and mobile, convert rails into drawers or bottom sheets without losing functionality.

## Required lesson sections

### A. Lesson header

Show:

- Programme, semester, subject code, unit, and lesson breadcrumbs.
- Lesson title and learning outcomes.
- Difficulty, duration, exam weightage, and prerequisites.
- Completion status and next lesson.
- Verified/draft content status for authorised preview roles.

### B. Curated lecture player

- Embed the primary approved YouTube video with `youtube-nocookie.com` where possible.
- Use the YouTube IFrame API for playback state, resume position, and progress.
- Display title, channel, duration, language, last checked date, quality score, and syllabus coverage.
- Show chapter timestamps mapped to lesson sections.
- Include alternate lectures and practical demonstrations without overwhelming the student.
- Remember the student's last playback position.
- Mark unavailable, private, region-blocked, non-embeddable, or deleted videos clearly and automatically fall back to the best verified alternative.
- Provide an external Watch on YouTube fallback but keep the normal experience inside Lernio.
- Never bypass ads, restrictions, rights, or platform policies.

### C. Five learning modes, upgraded

Preserve and improve the current modes:

1. **Learn** - structured explanation with examples and citations.
2. **Simplify** - simple English, Hinglish, Marathi, analogy, five-minute explanation, and one-minute recap.
3. **Visualise** - interactive diagrams, algorithm traces, circuit diagrams, process animation, architecture maps, or code execution flow.
4. **Practise** - guided examples, MCQs, output tracing, numerical problems, coding tasks, viva questions, and hints.
5. **Revise** - short notes, definitions, formulas, flashcards, common confusions, and exam-ready answers.

The video should complement these modes, not be a disconnected card.

### D. Lesson notes

Provide:

- Beautiful in-app HTML notes as the canonical accessible version.
- A previewable and downloadable PDF generated from the same approved content.
- Quick notes and full notes options.
- Formula/code/command cheat sheet when relevant.
- Infographic and concept-map gallery.
- One-page revision sheet.
- Glossary.
- Citations and source provenance.
- Version and reviewer status.

### E. Practice and mastery

- A short diagnostic before the lesson when useful.
- Embedded checkpoint questions during or after sections.
- End-of-lesson quiz.
- Retry and hint flow.
- Explanations tied to the lesson.
- Mastery update using real evidence.
- Recommended next action based on performance.

### F. LEO integration

Open LEO already scoped to:

- programme
- semester
- subject
- unit
- lesson
- current video chapter
- approved lesson notes
- the student's weak points

LEO must cite approved Lesson and Resource content. Extend retrieval beyond the current five Lesson JSON fields to include verified generated notes, transcript summaries, chapter metadata, formulas, and approved references. Do not expose unreviewed or private resources to normal students.

### G. Personal study tools

- Bookmark lesson or a specific section.
- Add a personal note.
- Copy deep link to a heading or timestamp.
- Add to planner.
- Download approved PDF.
- Report broken video or incorrect notes.
- Mark complete only when the defined completion criteria are satisfied.
- Navigate to previous/next lesson.

---

# 14. REDESIGN THE STUDENT DASHBOARD AROUND LEARNING

Learning must become the dashboard's dominant story. XP and streaks should encourage study, not distract from it.

## New dashboard hierarchy

1. **My Semester Hero**
   - Programme, semester, scheme, and division.
   - Overall semester progress.
   - Continue current lesson.
   - Today's target.
   - Exam countdown.

2. **Today's Learning Path**
   - 1-3 recommended actions.
   - Example: watch one lesson, complete five questions, revise one weak topic.
   - Explain why each action is selected.

3. **Continue Learning**
   - Video/lesson resume with exact timestamp or content section.
   - Progress across the lesson's required activities.

4. **Subject Progress**
   - Current semester subjects only.
   - Unit progress, mastery, notes/video availability, and next lesson.

5. **Weak Topics and Revision Due**
   - Priority recovery actions.

6. **Upcoming Academic Work**
   - Planner tasks, practicals, tests, and exams.

7. **Resource Updates**
   - Newly verified notes, replacement videos, or uploaded official materials relevant to this student's semester.

8. **Achievements and Activity**
   - Keep current streak, XP, heatmap, and achievements, but move them below learning priorities or integrate them compactly.

## Dashboard data

Create one efficient server-side dashboard query or orchestrator that returns only the signed-in student's scoped semester snapshot. Avoid multiple redundant client requests and avoid loading every subject from every semester.

---

# 15. IMPORT AND VERIFY ALL YOUTUBE RESOURCES

Create an ingestion pipeline for the two supplied PDF guides.

## Extraction

- Extract text and PDF link annotations directly.
- Do not OCR unless normal text/annotation extraction fails.
- Parse every subject section and URL into a structured candidate manifest.
- Deduplicate by canonical YouTube video ID or playlist ID.
- Preserve the source PDF, page, section, and original label.

Create a command such as:

```bash
npm run content:import:youtube-guides -- \
  --sem12 ./content-import/CWIT_Semester_1_2_YouTube_Lecture_Links.pdf \
  --sem36 ./content-import/CWIT_Semester_3_to_6_YouTube_Lecture_Links.pdf \
  --dry-run
```

Then support `--write` only after validation.

## Candidate manifest fields

At minimum:

```json
{
  "institutionCode": "CWIT",
  "programmeCodes": ["DCOMP", "DCIOT"],
  "schemeCode": "R23",
  "semesterNumber": 2,
  "subjectCode": "R23CP1401",
  "unitNumber": 1,
  "topicSlug": "c-program-structure",
  "lessonSlug": "structure-of-a-c-program",
  "resourceRole": "primary_video",
  "url": "https://www.youtube.com/watch?v=...",
  "videoId": "...",
  "playlistId": null,
  "title": "...",
  "channel": "...",
  "durationSeconds": 0,
  "language": "en-Hinglish",
  "coveragePercentage": 0,
  "qualityScore": 0,
  "embeddable": false,
  "availabilityStatus": "unchecked",
  "checkedAt": null,
  "sourceDocument": "CWIT_Semester_1_2_YouTube_Lecture_Links.pdf",
  "sourcePage": 1,
  "verificationStatus": "candidate"
}
```

## Verification

When a YouTube Data API key or approved metadata method is available, verify:

- canonical video ID
- current title/channel
- availability
- embeddability
- duration
- thumbnail
- age/restriction status where available
- captions availability
- playlist membership
- last metadata check

Without API credentials, use supported public metadata such as oEmbed where lawful and mark unverifiable fields honestly. Never label a link verified merely because it appears in the PDF.

## Mapping quality

Map videos to specific lessons, not merely to subjects. Score each candidate on:

- official syllabus coverage
- technical correctness
- clarity
- practical demonstration quality
- audio/video readability
- language fit
- appropriate depth
- recency where relevant
- continuity with adjacent lessons
- embeddability and stability

Keep one primary video and a small number of strong alternatives. Avoid dumping dozens of unrelated links on students.

Add a scheduled/manual link-health check that marks stale resources and queues replacements without deleting history.

---

# 16. BUILD THE LESSON NOTES AND PDF GENERATION PIPELINE

The goal is not to manually commit hundreds of static PDFs. Build a reproducible, reviewable pipeline.

## Inputs per lesson

- Official syllabus topic and outcomes.
- Approved primary/alternate video metadata.
- Legally available captions/transcript or authorised/manual transcript.
- Approved references and existing lesson content.
- Subject-specific diagram templates.
- Exam pattern and question evidence when verified.

If a transcript is unavailable, generate notes from official syllabus and approved references, and label that the video transcript was not used. Do not scrape blocked transcripts or violate platform terms.

## Processing stages

1. Gather and normalise sources.
2. Split the lesson into syllabus-aligned sections.
3. Generate structured draft content through the existing AI provider abstraction; do not hardwire one provider into UI code.
4. Validate output with Zod schemas.
5. Run deterministic checks:
   - required sections present
   - formulas/code syntax balanced
   - citations resolve
   - no unsupported claims
   - no duplicate sections
   - no excessive verbatim transcript overlap
   - terminology matches the syllabus
6. Create accessible HTML notes first.
7. Generate deterministic SVG/Mermaid/custom diagrams and meaningful charts.
8. Render a print route to PDF using the existing Playwright/Chromium capability or another repository-compatible renderer.
9. Store HTML/PDF and thumbnails in configurable object storage; store metadata in PostgreSQL.
10. Place the result in reviewer status, never auto-published.
11. Publish only after reviewer approval.

## PDF content specification

Each full lesson PDF should usually include:

1. Cover/header with Lernio, programme, semester, subject code, unit, lesson, version, and verification status.
2. Learning outcomes.
3. Prerequisites.
4. Concept map.
5. Core explanation in clear student-friendly language.
6. Step-by-step worked examples.
7. Meaningful charts, tables, diagrams, or infographics.
8. Subject-specific visualisation:
   - Mathematics: formula maps, worked-step layouts, graphs.
   - Physics/Chemistry: labelled diagrams and comparison tables.
   - C/C++/Python: flowcharts, memory diagrams, execution traces, code with output.
   - Linux: command trees, terminal examples, permission diagrams.
   - Web: DOM, CSS box model, responsive layout visuals.
   - BEEE: circuit diagrams, waveform or component comparisons, solved numericals.
   - Data Structures: node diagrams, algorithm traces, complexity tables.
   - Networking: layered architecture, packet flow, subnetting steps.
   - Microprocessors/Microcontrollers: block diagrams, registers, timing/interfacing maps.
   - IoT/Embedded OS: sensor-to-cloud flows, scheduling diagrams, hardware/software interfaces.
9. Common mistakes and misconceptions.
10. Exam-focused points and answer-writing guidance.
11. Short practice set with answers/explanations where approved.
12. One-page quick revision sheet.
13. Glossary.
14. Source list and deep link/QR code back to the Lernio lesson.
15. Page numbers and accessible document metadata.

Use a consistent design system and print-safe typography. Charts and infographics must clarify the concept, not exist as decoration. Ensure no clipped content, broken code blocks, unreadable equations, or low-contrast diagrams.

## Generated document variants

Support:

- Full lesson notes.
- Quick notes.
- One-page revision sheet.
- Formula/command/code cheat sheet.
- Unit revision pack.
- Subject revision handbook.

Avoid generating all variants when they provide no value. Use subject-aware templates.

---

# 17. ADMIN, TEACHER, AND REVIEWER CONTENT WORKFLOW

Extend existing syllabus and resource governance rather than building an unprotected back door.

Required capabilities:

- Import curriculum manifests in dry-run mode.
- View exact source evidence and differences before write.
- Map a candidate video to programme, semester, subject, unit, topic, and lesson.
- Set primary/alternate role and order.
- Inspect metadata and link health.
- Preview generated HTML and PDF notes.
- Compare versions.
- Request changes.
- Approve/reject/hold.
- Publish/unpublish/archive.
- See who generated, reviewed, and published every item.
- Regenerate notes without overwriting the published version.
- Report coverage gaps by semester, subject, unit, and lesson.
- Track videos with no notes, notes with no video, lessons with no quiz, and broken links.

Every write action must use existing authority checks and create audit events.

Normal students must never see draft, rejected, private, held, or unreviewed content.

---

# 18. INTEGRATE THE REST OF LERNIO AROUND THE CURRICULUM

## Practice

- Default to the student's current semester.
- Filter by subject, unit, lesson, difficulty, and weak topics.
- Launch practice directly from a lesson.
- Feed evidence into mastery and recommendations.

## Revision

- Generate revision schedules from completed lessons and mastery.
- Link every revision card back to its source lesson and notes.
- Support lesson, unit, and subject revision packs.

## Exams

- Use current semester subjects only by default.
- Show official assessment pattern where verified.
- Create syllabus-aware practice papers from approved questions.
- Never fabricate previous-year attribution.

## Labs and Coding

- Attach practical experiments and coding exercises to exact lessons.
- For programming lessons, provide runnable starter code, tests, expected output, hints, and solution review.
- For IoT/electronics, provide simulations or safe guided procedures where practical.

## Materials

- Keep the broader Materials library, but make lesson resources visible directly inside the lesson.
- Add filters for programme, semester, subject, unit, lesson, type, verified state, and language.
- Prevent duplicate resource records through canonical URL/external ID checks.

## Search and command palette

Search must understand programme, semester, subject code, unit, lesson, notes, resources, and commands. Results must respect user scope and publication status.

---

# 19. STATE, PROGRESS, AND COMPLETION

Move curriculum identity into canonical URLs and server queries. Use Zustand only for ephemeral client UI state, not as the sole source of academic navigation truth.

Persist continue-learning server-side or through a safe user-scoped persistence mechanism so it works after refresh and across devices.

Track separately:

- lesson opened
- video watched percentage and last timestamp
- sections read
- learning modes completed
- checkpoints attempted
- quiz result
- notes downloaded
- personal bookmark/note
- lesson completion
- mastery evidence

Define completion rules per lesson. Do not award full completion merely because a page was opened. A sensible default can combine required content viewed, one meaningful practice attempt, and explicit completion, but allow subject-specific configuration.

All XP awards must use the existing idempotent ledger and must not be exploitable by repeated requests.

---

# 20. PERFORMANCE AND TECHNICAL QUALITY

- Do not load all six semesters and every lesson body in the initial dashboard payload.
- Server-render semester and subject summaries.
- Fetch full lesson content only for the active lesson.
- Dynamically load heavy video, diagram, PDF preview, coding, and chart components.
- Avoid duplicate API requests already covered by server bootstrap.
- Use pagination for resources and admin queues.
- Add appropriate database indexes.
- Use cache tags for published curriculum and invalidate on publication.
- Keep personal data private/no-store.
- Use streaming/skeletons for slow sections.
- Preserve current bundle splitting for non-dashboard views.
- Refactor giant components into testable modules.
- Avoid needless animation; honour reduced motion.

Measure and report route bundle size, query count, and Web Vitals before and after. Target a usable experience on mid-range Android devices and ordinary Indian mobile networks.

---

# 21. ACCESSIBILITY AND LOW-BANDWIDTH REQUIREMENTS

- Full keyboard navigation.
- Visible focus states.
- Semantic heading structure.
- Screen-reader labels.
- High contrast and non-colour status indicators.
- Captions/transcript alternatives for video where available.
- Text alternatives for diagrams and infographics.
- Reduced-motion mode.
- Responsive design from approximately 360px upward.
- Video quality control and a low-data option where the provider allows it.
- Downloadable notes for offline study.
- Graceful fallback when video is unavailable or bandwidth is poor.
- No information hidden only behind hover.

Add or extend Playwright accessibility tests with axe.

---

# 22. SECURITY, PRIVACY, AND COPYRIGHT

- Enforce programme/semester/resource access server-side.
- Prevent IDOR by validating every requested subject, lesson, resource, and progress record against the current user scope.
- Allow draft preview only to authorised roles.
- Sanitize rendered Markdown/HTML.
- Use an allowlist for embeddable providers and iframe origins.
- Use restrictive CSP rules compatible with approved YouTube embeds.
- Use signed/private storage URLs where required.
- Validate upload type, extension, MIME, size, and content.
- Never expose API keys in the client.
- Do not copy or redistribute copyrighted textbooks or video files.
- Do not reproduce full transcripts verbatim as notes.
- Store source, creator, licence, and attribution metadata.
- Keep audit logs for content lifecycle actions.

---

# 23. TESTING REQUIREMENTS

## Unit tests

Cover:

- programme and semester scope resolution
- archived department exclusion
- curriculum manifest validation
- subject applicability
- shared CP/CI resource mapping
- video URL canonicalisation and deduplication
- lesson-resource ordering
- completion calculation
- generated-note validation
- publication state rules
- AI retrieval scope

## Integration tests

Cover:

- migrations and backfills
- `/api/academics`
- semester/subject/lesson loaders
- materials/resource APIs
- video progress persistence
- generated document jobs
- reviewer publication flow
- cache invalidation
- role access control

## End-to-end tests

At minimum create scenarios for:

1. COMP Semester 1 student.
2. CIOT Semester 2 student with BEEE.
3. COMP advanced-semester student.
4. CIOT advanced-semester student.
5. Student deep-linking to a lesson and resuming video.
6. Student viewing/downloading approved lesson notes.
7. Broken primary video falling back to an alternative.
8. Reviewer approving a generated PDF.
9. Student being unable to access draft content.
10. Other departments not appearing in onboarding or student navigation.
11. Mobile semester and lesson navigation.
12. Keyboard and accessibility flow.

Run:

```bash
npm run check
npm run build
npm run test:e2e
npm run test:a11y
npm run test:visual
```

Fix failures rather than weakening tests.

---

# 24. MIGRATION AND RELEASE STRATEGY

Use additive migrations first:

1. Add new relations/models/fields.
2. Backfill existing lessons/resources.
3. Deploy code that supports old and new data.
4. Import curriculum/resource candidates in dry-run mode.
5. Review and publish verified content.
6. Switch student routes and dashboard to scoped queries.
7. Archive old department visibility.
8. Remove obsolete compatibility code only after successful verification.

Provide:

- database backup guidance
- dry-run outputs
- rollback plan
- environment variables
- object-storage configuration
- YouTube metadata credential instructions
- content generation worker instructions
- deployment order for Prisma migrations and Vercel
- post-deploy health checks

Do not make routine production builds run destructive seeds or long content-generation jobs.

---

# 25. SPECIFIC FILES TO INSPECT AND LIKELY MODIFY

This is a starting list, not permission to ignore other dependencies:

- `README.md`
- `package.json`
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `scripts/seed.ts`
- `scripts/upsert-cwit-departments.ts`
- `scripts/import-cwit-source-registry.ts`
- `src/lib/cwit-departments.ts`
- `src/lib/campus-auth.ts`
- `src/lib/app-bootstrap.ts`
- `src/lib/app-bootstrap-types.ts`
- `src/lib/types.ts`
- `src/lib/ai/retrieval.ts`
- `src/lib/resources/**`
- `src/lib/syllabus/**`
- `src/store/app-store.ts`
- `src/app/learn/**`
- `src/app/dashboard/**`
- `src/app/api/academics/route.ts`
- `src/app/api/materials/**`
- `src/app/api/progress/**`
- `src/app/admin/syllabus/**`
- `src/app/admin/resources/**`
- `src/app/complete-profile/**`
- `src/components/app/learning-app.tsx`
- `src/components/app/route-view-page.tsx`
- `src/components/views/learn.tsx`
- `src/components/views/dashboard.tsx`
- `src/components/views/materials.tsx`
- `src/components/views/practice.tsx`
- `src/components/views/revision.tsx`
- `src/components/views/tutor.tsx`
- `src/components/layout/**`
- `src/components/ui/**`
- `tests/**`

---

# 26. REQUIRED DELIVERABLES

At completion, provide:

1. Current-state audit.
2. Target architecture and data model.
3. Safe database migrations and backfills.
4. Only COMP and CIOT active/selectable in the product.
5. Full versioned curriculum manifests for both programmes and all six semesters.
6. Source-verification and coverage report.
7. Programme/semester-scoped APIs and bootstrap.
8. Canonical semester, subject, unit, and lesson routes.
9. Redesigned learning-first dashboard.
10. Semester overview pages for Semesters 1-6.
11. Subject pages.
12. Complete lesson study studio.
13. Imported, deduplicated, verified lecture resources from both supplied PDFs.
14. Lesson-resource mappings.
15. Reproducible accessible HTML/PDF notes pipeline.
16. Reviewer/admin workflow and audit trail.
17. LEO retrieval extended to approved notes/resources.
18. Integrated Practice, Revision, Exams, Labs, Coding, Materials, Planner, and Search context.
19. Automated tests and test results.
20. Migration, deployment, rollback, and operations documentation.

Also provide a machine-readable final coverage report such as:

```json
{
  "programme": "DCOMP",
  "semester": 3,
  "subjects": 0,
  "lessons": 0,
  "lessonsWithPrimaryVideo": 0,
  "lessonsWithApprovedPdf": 0,
  "lessonsWithPractice": 0,
  "brokenResources": 0,
  "pendingVerification": 0
}
```

---

# 27. DEFINITION OF DONE

The project is not complete merely because attractive pages exist.

It is complete only when:

- New users can select only COMP or CIOT.
- Each target programme has a verified six-semester curriculum structure.
- A student's dashboard and Learn experience automatically reflect their exact programme and semester.
- Every semester has a canonical page and complete subject map.
- Every published lesson has structured content and clearly reported resource coverage.
- Curated videos are mapped to specific lessons and verified for current availability/embeddability.
- Approved lesson notes can be read in-app and downloaded as polished PDFs.
- PDFs contain meaningful educational diagrams/charts/infographics and citations.
- LEO answers from approved lesson/resource context.
- Practice and revision are linked to the same curriculum.
- Progress persists correctly and cannot be spoofed trivially.
- Draft/unverified content is hidden from students.
- Admin/reviewer workflows are functional and audited.
- The system works on mobile, keyboard, screen reader, low bandwidth, and reduced motion.
- Migrations preserve data.
- Tests, lint, typecheck, and production build pass.
- Remaining unverified curriculum or content gaps are shown honestly in the coverage report.

---

# 28. ANTI-PATTERNS TO AVOID

Do not:

- Build six copy-pasted semester pages.
- Keep adding thousands of lines to `learn.tsx`.
- Filter subjects only in the browser.
- Hard-delete old departments or audit data.
- Treat the Gemini report as more authoritative than official CWIT documents.
- Guess missing R23 codes.
- Publish every link from the PDF without checking it.
- Attach videos only at subject level.
- Store hundreds of generated PDFs directly in Git.
- Rehost YouTube videos.
- Generate transcript dumps and call them notes.
- Auto-publish AI content.
- Create decorative infographics with no teaching value.
- Break existing role/authority checks.
- Expose draft/private resources.
- Replace the existing AI/resource/review architecture with disconnected one-off code.
- Claim all six semesters are complete while verification or coverage gaps remain.

---

# 29. FINAL EXECUTION REPORT FORMAT

At the end of each phase, report:

1. What was inspected.
2. What changed.
3. Files added/modified.
4. Migrations added.
5. Data imported/backfilled.
6. Tests run and exact results.
7. Performance/accessibility findings.
8. Security/copyright checks.
9. Remaining manual verification.
10. Next phase.

At final completion, include a concise architecture diagram, route map, database relationship summary, curriculum coverage table, resource coverage table, deployment checklist, and honest list of remaining gaps.
