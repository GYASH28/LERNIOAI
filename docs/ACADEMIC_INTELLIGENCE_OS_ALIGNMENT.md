# CWIT Academic Intelligence OS Alignment

This document records the implementable slice taken from the supplied visual blueprint, cinematic prompt, and supermaster implementation prompt.

## Source Files Reviewed

- `LERNIO_CWIT_ACADEMIC_INTELLIGENCE_OS_SUPERMASTER_PROMPT_CINEMATIC_EDITION.md`
- `LERNIO_CWIT_ACADEMIC_INTELLIGENCE_OS_VISUAL_BLUEPRINT.pptx`
- `LERNIO_CWIT_ACADEMIC_INTELLIGENCE_OS_VISUAL_BLUEPRINT.pdf`
- `Placeholder.pdf`

The PDF blueprint export is only a generation placeholder. The PPTX contains the usable visual blueprint text.

## Implemented In This Pass

- Added a public CWIT Academic Intelligence OS section with the 6 branch x 6 semester dashboard matrix.
- Reframed the landing hero around "One Academic System. Every CWIT Semester."
- Added static, no-JS Academic OS visual signals to the hero knowledge-core poster.
- Moved public role language away from permanent Reviewer and Moderator workspaces.
- Reframed review and moderation as scoped capability grants.
- Removed visible authority-version terminology from workspace and admin access UI.
- Updated Admin, HOD, Teacher, CR, review, and safety workspace copy to match academic operations.
- Added an honest public status note that current seeded production content is the Computer Engineering Semester 3 pilot.

## Current Foundation Already Present

- Prisma models for institutions, departments, programmes, schemes, semesters, subjects, units, topics, resources, syllabus documents, import jobs, class groups, teaching assignments, authority grants, role assignments, and audit events.
- CWIT department/programme seed script: `npm run db:departments`.
- CWIT source registry import script: `npm run db:cwit:sources`.
- Admin user upsert script: `npm run db:admin`.
- Server-side authority resolution and guarded workspaces for Admin, Coordinator/HOD, Teacher, CR, and legacy capability routes.
- Public landing route is static and does not load dashboard runtime or cursor/motion runtime.

## Deferred Backend Phases

These remain real implementation work and should not be presented as complete:

1. Full verified CWIT subject catalogue for every branch and semester.
2. Academic-year entity and launch wizard.
3. Student/staff/timetable import dry-run, alias learning, and rollback.
4. Dynamic department dashboard resolver.
5. Dynamic branch-semester dashboard resolver for all 36 combinations.
6. Subject workspace tabs for Learn, Syllabus, Videos, Notes, Practice, Practical, Exam Prep, and Progress.
7. Resource intelligence scoring and publish pipeline across official and trusted sources.
8. Timetable-aware student daily plan and teacher today view.
9. Migration from Reviewer/Moderator primary roles into capability grants at the data/API boundary.
10. Optional premium cinematic/WebGL book asset with measurable performance budgets.

## Guardrails

- Do not fabricate official CWIT subjects or rules without source evidence.
- Keep WebGL/cinematic work optional and off internal dashboards.
- Keep operational dashboards fast, dense, accessible, and role-specific.
- Preserve legacy reviewer/moderator routes until existing data is migrated safely.
- Keep admin screens focused on academic operations; developer internals belong in protected Super Admin tooling.
