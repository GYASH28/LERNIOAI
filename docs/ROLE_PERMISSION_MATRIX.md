# Role Permission Matrix

The canonical matrix is `src/lib/roles.ts`.

## Roles

- `student`
- `cr`
- `teacher`
- `coordinator`
- `moderator`
- `reviewer`
- `admin`

## Capability Model

Capabilities use dot-separated names, such as:

- `roles.assign`
- `lessons.update`
- `questions.review`
- `reports.resolve`
- `analytics.department.read`
- `ai.tutor.use`

Legacy permission names are still accepted only as aliases for existing code paths:

- `role.assign` -> `roles.assign`
- `user.manage` -> `users.update`
- `content.read` -> `lessons.read`
- `content.submit` -> `contributions.create`
- `content.review` -> `contributions.review`
- `content.publish` -> `lessons.publish`
- `analytics.institute.read` -> `analytics.institution.read`

New code should use the canonical names.

## Baseline Intent

- Student: personal learning, published content, contributions, reports, AI tutor.
- CR: student capabilities plus class support tools.
- Teacher: subject/class content production for assigned subjects only.
- Coordinator: department-scoped operations, assignment, curriculum, analytics, and review workflows.
- Reviewer: academic quality workflow only; no user management by default.
- Moderator: reports and safety workflow only; no academic publishing by default.
- Admin: full platform capability, constrained by service-level safety invariants.

## Scope Requirements

Capabilities alone are not enough for elevated roles. Non-admin authority must match scope.

- Teacher subject actions require an assigned subject.
- Coordinator role/user actions require an assigned department.
- CR class actions require an assigned class group or complete legacy class key.
- Moderator institution actions require institution scope.
- Missing scope is denied.
- Malformed legacy JSON is denied.

## Tests

Focused coverage:

- `src/lib/roles.test.ts`
- `src/lib/authority/scope.test.ts`
