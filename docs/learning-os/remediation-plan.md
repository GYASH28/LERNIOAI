> **⚠️ SUPERSEDED** — This document describes a remediation plan for problems that were fixed in subsequent releases. See `docs/AUDIT_REPORT.md` and the current codebase for the actual state.

# Learning OS Remediation Plan

Date: 2026-06-29

## Source

This plan incorporates `LERNIO_AI_2.0_Complete_Implementation_Prompt.md` and `LERNIO_AI_2.0_Gap_Bug_Change_Audit_Report.md` from the audit package.

## P0 Correctness

- Provide reproducible local PostgreSQL setup and runbook.
- Require published schemes for normal students.
- Hide draft/unreviewed subjects and questions from normal students.
- Keep units/topics hidden until reviewed and published.
- Change new lesson default status to `draft`.
- Ignore client-supplied video percent/completion and compute watch credit server-side.
- Link quiz attempts to lessons so quiz completion criteria can be satisfied.
- Add tests for publication policy, video credit and lesson quiz evidence.

## P1 Curriculum Foundation

- Preserve official subject order using `Subject.displayOrder`.
- Keep CIOT Semester 3-6 blocked until an official semester-placement source is available.
- Extend the importer beyond scheme/semester/subject rows.
- Import existing official course outcomes.
- Add governed elective selection/allocation models and filter normal student scope by selection/allocation.
- Continue official unit review from `official-unit-candidate-review-queue.json`; do not auto-promote rows with quality blockers.

## P2 Student Product

- Finish the shared student route shell for canonical Learn pages.
- Expand semester/subject/lesson pages with server-derived continue learning, readiness, counts, notes, practice and fallback states.
- Keep legacy Learn as a temporary fallback only while canonical routes pass authenticated E2E.

## P3 Content Operations

- Expand playlists only when YouTube API credentials or a reviewed manual import are available.
- Add audited reviewer actions for lesson video mapping, primary/alternate selection and approval.
- Implement generation job worker only after approved lesson structure/resources exist.
- Store approved HTML/PDF artifacts in configured object storage, not Git.

## P4 Release Quality

- Add authenticated learning E2E scenarios.
- Add learning-page accessibility tests.
- Add CSP and provider allowlists.
- Add cache invalidation and performance measurement.
- Run the final command matrix only when PostgreSQL and external credentials are configured.

## Non-Negotiable Blockers

- Do not infer CIOT Semester 3-6 placement from course identity or timetable appearances alone.
- Do not publish generated notes or YouTube mappings without reviewer approval.
- Do not push/deploy as complete while `/api/ready` is unhealthy or required coverage remains zero.
