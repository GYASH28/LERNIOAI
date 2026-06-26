# Role Permission Matrix

The canonical role and capability registry is `src/lib/roles.ts`.

## Roles

- `student`
- `cr`
- `teacher`
- `coordinator`
- `moderator`
- `reviewer`
- `admin`

## Capability Names

Capabilities use dot-separated names:

- `users.read`
- `roles.assign`
- `roles.revoke`
- `lessons.update`
- `lessons.review`
- `questions.publish`
- `resources.review`
- `analytics.department.read`
- `reports.resolve`
- `audit.read`
- `ai.tutor.use`

Legacy aliases are accepted only for old code paths:

- `role.assign` -> `roles.assign`
- `user.manage` -> `users.update`
- `content.read` -> `lessons.read`
- `content.submit` -> `contributions.create`
- `content.review` -> `contributions.review`
- `content.publish` -> `lessons.publish`
- `analytics.institute.read` -> `analytics.institution.read`

New code should use canonical names.

## Baseline Intent

- Student: personal learning, published content, contributions, reports, and AI tutor.
- CR: student access plus class-safe resource, feedback, and reporting tools.
- Teacher: assigned subject/class content production.
- Coordinator: department-scoped operations, assignment, curriculum, analytics, and review workflow.
- Reviewer: academic quality workflow only; no user management by default.
- Moderator: reports and safety workflow only; no academic publishing by default.
- Admin: broad platform authority, constrained by service-level safety invariants.

## Scope Requirements

Capabilities alone do not grant elevated access. Non-admin access must also match scope.

- Teacher subject actions require `subjectId` scope through `TeachingAssignment` or scoped `RoleAssignment`.
- Coordinator actions require department scope through scoped `RoleAssignment`.
- Reviewer queues use scoped subject/department content only.
- Moderator queues require institution scope unless the actor is admin.
- CR tools require active `ClassMembership` or scoped `RoleAssignment`.
- Missing scope is denied.
- Client-editable profile fields are not elevated scope.
- Legacy malformed data is denied.

## Implemented Coverage

- Unit tests: `src/lib/roles.test.ts`
- Scope tests: `src/lib/authority/scope.test.ts`
- Routing tests: `src/lib/campus-auth.test.ts`
- Audit redaction tests: `src/lib/authority/audit.test.ts`

## Remaining Matrix Work

The registry includes the broad capability vocabulary. Some capabilities still need full CRUD APIs and UI modules before they are considered product-complete.
