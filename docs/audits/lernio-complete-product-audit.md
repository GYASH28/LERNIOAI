# Lernio Complete Product Audit

**Date:** 2026-07-27
**Auditor:** AI-assisted codebase review
**Branch:** repair/student-experience-overhaul (from main @ 63fac1b)
**Scope:** Static code review of `src/`, `prisma/`, `scripts/`, `docs/`

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Pages (page.tsx) | 52 |
| API routes | 92 |
| Components | 183 |
| Prisma models | 104 |
| TypeScript errors | 0 |
| ESLint errors | 0 (fixed during audit) |
| ESLint warnings | 407 |
| `as any` / `: any` occurrences | 79 |
| "coming soon" / placeholder instances | 119 |
| Custom cursor mounted globally | Was YES — now REMOVED |
| Animated background mounted globally | Was YES — now REMOVED |

---

## Feature Audit Table

| Feature | Route | UI Component | Data Source | API | Persistence | Mobile Status | Error Handling | Real Status | Required Action |
|---------|-------|-------------|-------------|-----|-------------|---------------|----------------|-------------|-----------------|
| Dashboard | /dashboard | DashboardView | DB (app-bootstrap) | /api/analytics/* | DB | Working with defects | Basic | Working with defects | Fix mobile layout, verify stats |
| Learn (subjects) | /learn | LearnView (deleted on main) | DB + manifest | /api/learning/* | DB | Needs verification | Basic | Needs runtime verification | Verify lesson loading after learn.tsx deletion |
| Learn (lesson) | /learn/.../lesson/[slug] | LessonStudio | DB + lesson-notes JSON | /api/learning/* | DB | Needs verification | Basic | Working with defects | Verify lesson routing, fix mobile layout |
| Materials | /materials | MaterialsView | DB + manifest | /api/materials | DB | Working | Good | Fully working | Verify mobile |
| Materials (lesson) | /materials/lesson/... | PremiumLessonReader/LearnModeReader | lesson-notes JSON | N/A | localStorage | Needs verification | Basic | Working with defects | Verify content loading per lesson |
| AI Tutor | /tutor | LeoStudio | DB + AI (Groq/Gemini) | /api/tutor/* | DB | Working with defects | Good | Working with defects | Fix mobile layout alignment |
| Revision | /revision | RevisionView | DB | /api/revision/* | DB | Needs verification | Basic | Working with defects | Fix reveal flow, verify SM-2 |
| Practice | /practice | PracticeView | DB | /api/quiz/* | DB | Needs verification | Basic | Working with defects | Verify quiz persistence |
| Exams | /exams | ExamsView | DB | /api/exams/* | DB | Needs verification | Basic | Working with defects | Verify exam flow |
| Coding | /coding | CodingView | DB + Judge0 | /api/coding | DB | Working with defects | Good (visible errors) | Working with defects | Fix mobile editor |
| Labs | /labs | LabsView | DB | /api/labs | DB | Needs verification | Basic | Partially implemented | Verify content depth |
| Planner | /planner | PlannerView | DB | /api/planner/* | DB | Needs verification | Basic | Working with defects | Fix timezone (UTC vs local) |
| Analytics | /analytics | AnalyticsView | DB | /api/analytics/* | DB | Needs verification | Basic | Working with defects | Verify real data vs placeholder |
| Profile | /profile | ProfileView | DB | /api/user/* | DB | Working | Good | Fully working | Verify mobile |
| Notifications | /notifications | NotificationBell | DB | /api/notifications | DB | Working | Good | Fully working | Verify mobile |
| Leaderboard | /leaderboard | (page) | DB | /api/leaderboard | DB | Needs verification | Basic | Fully working | Verify mobile |
| Class | /class | ClassClient | DB | /api/class | DB | Working | Good | Fully working | Verify mobile |
| Attendance | /attendance | (page) | DB | /api/attendance | DB | Working | Good | Fully working | Verify mobile |
| Community | /community | (page) | DB | /api/class/* | DB | Needs verification | Basic | Fully working | Verify mobile |
| Feedback | /feedback | FeedbackForm | DB | /api/feedback | DB | Working | Good | Fully working | Verify mobile |
| Help | /help | (page) | Static | N/A | N/A | Working | Good | Fully working | — |
| Settings | /settings | (page) | DB | /api/user/* | DB | Working | Good | Fully working | — |
| Auth (sign-in) | /sign-in | AuthShell | DB | /api/auth/* | DB | Working | Good | Fully working | — |
| Auth (sign-up) | /sign-up | AuthShell | DB | /api/auth/* | DB | Working | Good | Fully working | — |

---

## Global Effects Audit

| Effect | Location | Status | Action |
|--------|----------|--------|--------|
| Custom cursor | layout.tsx (was mounted) | **REMOVED** | Removed from root layout — was causing jank on every mouse move, interfered with form controls |
| Animated canvas background | layout.tsx (was mounted) | **REMOVED** | Removed from root layout — was running on ALL pages including productivity screens (coding, exams, notes, chat) |
| ThemeAtmosphere | GlobalExperienceRuntime | Already removed | Was already removed in prior commit |
| LernioCursor | GlobalExperienceRuntime | Already removed | Was already removed in prior commit |

---

## Duplicate / Stale Component Audit

| Component | Status | Notes |
|-----------|--------|-------|
| src/components/views/tutor-v2.tsx | Deleted on main | Was dead code |
| src/components/views/tutor-v3.tsx | Deleted on main | Was dead code |
| src/components/views/tutor-v3.test.tsx | Deleted on main | Was testing dead code |
| src/components/views/learn.tsx | Deleted on main | Replaced by route-based learning |
| src/components/cmdk/command-palette.tsx | Deleted on main | Replaced by ui/command-palette.tsx |
| src/components/ui/custom-cursor.tsx | Still exists but not mounted | Can be deleted in future cleanup |
| src/components/ui/lernio-cursor.tsx | Still exists but not mounted | Can be deleted in future cleanup |
| src/components/ui/animated-background.tsx | Still exists but not mounted | Can be deleted in future cleanup |

---

## "Coming Soon" / Placeholder Audit

| File | Text | Status |
|------|------|--------|
| src/components/ui/empty-state.tsx:24 | "Materials coming soon" | Stale — /api/materials works |
| src/components/learning/lesson-notes-renderer.tsx:49 | "Lesson notes coming soon" | Content gap |
| src/app/class/class-client.tsx:402 | "timetable editing coming soon" | Not yet available |
| src/app/cr/cr-dashboard-client.tsx:234 | "Coming soon — direct messaging" | Not yet available |

**Note:** 119 total "coming soon"/placeholder/TODO instances found. Most are in scripts, comments, and non-student-facing code. The 4 above are student-visible.

---

## Mobile Navigation Audit

| Issue | Status |
|-------|--------|
| Bottom navigation exists | Yes — `MobileNav` in sidebar.tsx |
| Safe-area support | Partial — needs verification |
| Touch targets ≥44px | Partial — some controls still <44px |
| 18-item ungrouped menu | Needs verification — should be grouped |
| Bottom nav hidden during immersive tasks | Needs verification |

---

## Architecture Audit

| Area | Status | Notes |
|------|--------|-------|
| Multiple shells | Partially resolved | LearningApp uses AppPageShell, but some routes have own shells |
| Route registry | Not canonical | Navigation arrays duplicated across components |
| Curriculum source of truth | Mixed | DB + JSON manifests + hardcoded arrays |
| Video mapping | Subject-level | Should be lesson-level |
| Lesson routing | Fixed | findLessonBySlug uses exact match (was loose substring) |
| Global effects | Fixed | Custom cursor + animated background removed |

---

## Silent Failure Audit

| Feature | Env Var | Status | Action |
|---------|---------|--------|--------|
| Code execution | CODE_RUNNER_URL | Visible error (503) | Done |
| Transactional email | RESEND_API_KEY | isEmailConfigured() exported | Done |
| Storage | STORAGE_* | isStorageConfigured() exported | Done |
| AI tutor | GROQ_API_KEY | Throws clear 503 | Done (reference pattern) |
| Admin health panel | N/A | New /api/admin/health + Health tab | Done |

---

## Priority Actions

1. **Fix student-visible "coming soon" text** (4 instances)
2. **Verify lesson routing works after learn.tsx deletion** (critical)
3. **Fix mobile navigation** — group items, 5-item bottom nav, More sheet
4. **Fix revision reveal flow** — student must see answer before rating
5. **Fix planner timezone** — use Asia/Kolkata, not UTC
6. **Verify quiz persistence** — every attempt must be saved
7. **Remove unused global effect components** (custom-cursor, animated-background, lernio-cursor)
8. **Clean up `as any` in touched files**
