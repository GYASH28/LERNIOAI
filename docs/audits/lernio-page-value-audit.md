# Lernio page-value audit

Audit date: 2026-08-01  
Scope: every current App Router page, its data flow, persistence, student output, and overlap with other pages.

## Standard used

A page earns a place in Lernio when it has a clear input, produces a useful learning or administrative output, preserves that output when appropriate, and does not duplicate a stronger workflow. Decorative activity, XP-only competition, and isolated mini-games do not pass this test.

## Decisions implemented

| Previous page | Decision | Replacement | Reason |
| --- | --- | --- | --- |
| `/games` | Removed and permanently redirected | `/practice` | The page stored isolated mini-game progress locally and did not create curriculum mastery evidence. Practice already owns retrieval and question work. |
| `/leaderboard` | Removed and permanently redirected | `/analytics` | Ranking students by XP is not a learning outcome. Analytics gives the student actionable progress information instead. |
| `/achievements` | Removed and permanently redirected | `/profile` | The same achievement data already appears in the profile/dashboard. The backend achievement signals remain; only the duplicate destination is gone. |
| `/student-os` | Keep as compatibility redirect | `/learn` | It is an old entry point, not a second product surface. |

Links, dashboard actions, lesson-tool cards, mobile navigation, and engagement copy pointing to the removed destinations were also removed or replaced.

## Student experience audit

| Route or route family | Real student job | Evidence/output | Decision |
| --- | --- | --- | --- |
| `/dashboard` | Decide what to do next | Current semester context, progress, deadlines, quick actions | Keep; use as a launchpad, not a second copy of every tool. |
| `/learn` and nested semester/subject/unit/lesson routes | Follow the official curriculum in order | Programme, semester, subject and unit progress; direct lesson workspace | Keep and strengthen with exact CWIT units and reviewed direct-video identity. Remove invented `coverageFocus` units and unrelated ordered-video fallbacks. |
| `/materials` and `/materials/lesson/...` | Understand and retain a topic | Five-phase Learn, Simplify, Visualise, Practise, Revise workspace; progress and notes | Keep and substantially strengthen. Reviewed rich notes win; every other subject now receives an official-CWIT-only curriculum pack, never invented substitute theory. |
| `/practice` | Retrieve knowledge and find gaps | Generated or stored questions, answers and explanations | Keep; this absorbs the former game destination. Questions must identify subject/unit provenance. |
| `/revision` | Review due knowledge | Flashcards, bookmarks and recall state | Keep. Current browser-only state should move to account persistence in a later data migration. |
| `/exams` | Rehearse assessment conditions | Attempts, scores and review | Keep. Preset coverage must resolve to official subject/unit scope. |
| `/coding` | Build programming fluency | Runnable code/challenge output | Keep for programming subjects; do not show it as a generic tool on non-coding lessons. |
| `/labs` | Practise a laboratory outcome | Simulation or lab-task result | Keep only where a CWIT practical outcome exists; generic simulations should not be presented as syllabus completion. |
| `/tutor` | Get contextual help | A conversation grounded in current programme/subject/unit | Keep. It must cite curriculum context and distinguish explanation from official text. |
| `/planner` | Convert deadlines and weaknesses into a plan | Tasks and generated schedule | Keep. Current local browser persistence is useful but not cross-device; account persistence is the next upgrade. |
| `/notebook` | Capture durable personal knowledge | Notes, formulas and mistake log | Keep and make discoverable. It is a student-owned output, unlike passive content browsing. |
| `/analytics` | Decide what to revise next | Progress, weak areas and trends | Keep; this absorbs leaderboard traffic and should prioritize actions over vanity totals. |
| `/attendance` | Track attendance risk | Student/class attendance records | Keep for authorized roles and enrolled students. It has persisted institutional data. |
| `/class` | Receive class-specific coordination | Announcements, polls and class state | Keep. It is institution-scoped and distinct from the broader community. |
| `/community` | Ask peers and discuss subjects | Persisted posts, comments, votes, reports and moderation | Keep. It passes the value test because it has durable discussion and safety workflows, not just a feed mock-up. |
| `/notifications` | Act on changes | Persisted notification state and destinations | Keep; notifications should link to the exact object that changed. |
| `/profile` | Manage identity and see milestones | Profile settings and achievement history | Keep; it is now the single achievement destination. |
| `/learning-profile` | Set learning preferences/context | Learning-profile data | Keep only as an onboarding/preferences editor; avoid duplicating `/profile`. |
| `/settings` | Control account and experience | Persisted preferences | Keep. |
| `/help` and `/help/[slug]` | Understand a workflow | Task-specific guidance | Keep, but remove obsolete help entries for deleted pages. |
| `/feedback` and `/support` | Report problems or request help | Submitted feedback/support request | Keep; clarify which is product feedback versus account/help support. |
| Authentication, profile completion, privacy and terms routes | Enter and govern the account safely | Account/session/legal state | Keep. |

## Staff and governance audit

| Route family | Value assessment | Decision |
| --- | --- | --- |
| `/admin` and `/admin/[module]` | Real institution/content administration with authorization | Keep, but keep its dashboard focused on exceptions and pending work. |
| `/admin/learning/course-catalog` | Canonical subject inventory | Keep. |
| `/admin/learning/coverage` | Shows missing curriculum/content coverage | Keep; report direct-video approval separately from candidate coverage. |
| `/admin/learning/notes` and `/notes/[noteSlug]` | Reviews note packs and source provenance | Keep; this is required before richer generated notes can replace curriculum-only fallback packs. |
| `/admin/learning/unit-candidates` | Resolves extracted unit structures | Keep while extraction/review work exists. |
| `/admin/resources/queue` and `/youtube-candidates` | Reviews direct resources before publication | Keep; never let a playlist, pending match, or automatic score become student-facing identity. |
| `/admin/syllabus/imports` and `/sources` | Maintains official source lineage | Keep. |
| `/cr` and `/cr/[module]` | Class representative workflows | Keep with role authorization. |
| `/coordinator` | Programme coordination | Keep with role authorization. |
| `/teacher-dashboard` | Teaching workflow | Keep with role authorization; route naming should later be normalized to `/teacher`. |
| `/moderator` | Community safety | Keep with role authorization. |

## Cross-platform issues found

1. Curriculum manifests contain correct subject codes but many unit titles are fragmented and many topic arrays are empty. The Learn fallback compounded this by fabricating generic units from `coverageFocus`.
2. The old lesson-video resolver could assign videos by list order when no topic match existed. That could show a valid video under the wrong lesson.
3. Student navigation is defined in multiple files. This creates inconsistent destinations and makes removed pages easy to leave behind.
4. Planner and revision use browser-only persistence. They work, but a student can lose the state or fail to see it on another device.
5. Help content still references Achievements as a standalone destination.
6. Several tools appear globally even when the current subject has no matching practical or coding outcome.

## Product rule going forward

Every new page must identify its user decision, durable output, curriculum or institutional source, and owning workflow. If the same output already belongs to an existing page, improve that page instead of adding another destination.
