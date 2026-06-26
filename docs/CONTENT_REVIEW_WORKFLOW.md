# Content Review Workflow

## Current Content States

Lessons currently use:

- `draft`
- `under_review`
- `verified`
- `published`
- `archived`

Contributions currently use:

- `draft`
- `submitted`
- `under_review`
- `requires_changes`
- `approved`
- `rejected`
- `archived`

## Authority Intent

- Teachers create and edit drafts only inside assigned subject/class scope.
- Teachers submit content for review.
- Reviewers inspect scoped academic content and can request changes, verify, or publish where capability allows.
- Moderators handle reports, unsafe uploads, duplicate material, and visibility holds.
- Admins can inspect and intervene, but actions remain audited.

## Current Implementation

The authority registry already separates:

- `lessons.create`
- `lessons.update`
- `lessons.submit_review`
- `lessons.review`
- `lessons.verify`
- `lessons.publish`
- `lessons.archive`
- `questions.review`
- `questions.publish`
- `resources.review`
- `resources.publish`
- `moderation.hold`
- `moderation.restore`

Reviewer and moderator workspaces show scoped queue data and fail closed when scope is missing.

## Remaining Work

The full content workflow still needs:

- service-level state machine helpers
- revision diff UI
- immutable review decisions
- publish/restore APIs
- optimistic concurrency checks
- dependency checks before archive/restore
- E2E tests for Teacher, Reviewer, Moderator, and Student contribution paths

Until those services are complete, do not add client-only publish or moderation controls.
