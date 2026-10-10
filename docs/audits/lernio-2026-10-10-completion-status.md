# Lernio — Product and Materials Completion Audit
**Audit date:** 10 October 2026  
**Repository:** `GYASH28/LERNIOAI`  
**Scope:** Auth, core study flows, Notes / Materials / lesson videos

## Evidence and release history

- PR #56 was merged into `main`; it repairs the obsolete NextAuth callback host, signup/session verification, adaptive practice, hint retrieval, manifest routing and incompatible dependency locks.
- PR #57 is the staged Notes experience: true lesson routes, Read/Slides/Quick Revision, 48 existing PDF links, new CIoT Semester 3 notes, and explicit curriculum aliases for verified equivalent subjects.
- PR #59 is the student-facing Materials V2 interface: lesson navigator, focus/text controls, working note search, grouped units, shareable subject filters, PDF preview and video discovery.
- Do **not** assume a GitHub merge proves production deployment. Check Vercel deployment status and then the live auth origin and authenticated learner journey.
- Automated checks exercise database migrations, ESLint, TypeScript, unit tests, Next.js production build, desktop/mobile Playwright and the production-dependency audit. The Notes V2 branch also adds `npm run notes:audit`.

## What is confirmed

| Area | Evidence | Remaining validation |
|---|---|---|
| Login origin | PR #56 + same-origin browser-session test | Verify credentials and reset emails on live production |
| Practice | Adaptive continuation, confidence before scoring and actual hint retrieval | User acceptance: varied adaptive question bank |
| PDF materials | 48 PDF URLs on the staged Materials catalog resolve to `public/` repository assets | Manual readability and academic accuracy of every PDF |
| Interactive notes | JSON notes for 46 subject files (before alias expansion) plus CIoT-specific additions | Editorial review of content depth, diagrams and syllabus alignment |
| Existing YouTube candidates | 100 candidate rows; 94 playlists and 6 direct-video URLs, all draft/unreviewed | Academic review and technically checked embeddability for each direct video |
| Videos in Materials V2 | Every interactive lesson has a **topic-specific YouTube search**, English/Hindi/Hinglish; PDF-only subjects get subject-level discovery | **Zero reviewed direct-video mappings currently published**; discovery results are not approved lessons |
| Notes usability | Read, Slides, Revise and Videos, mobile outline, focus, reading size, section search, previous/next navigation | Mobile real-device QA and accessibility keyboard walkthrough |

## High-priority remaining work

1. **Approved lesson videos:** Map real direct YouTube videos to official lesson IDs. The governance requirements in `docs/research/lernio-youtube-lesson-video-implementation-brief.md` must hold: direct ID, exact topic, spoken language, metadata, link health, embeddability and curricular reviewer decision. Never promote an unreviewed playlist or invent a video ID.
2. **Editorial content quality:** A JSON file or PDF existing is *not* proof of a detailed, correct lesson. Use `npm run notes:audit` to sort shallow/template-like lessons, then rewrite the highest-impact subjects with explanations, notebook diagrams, sample problems, verified definitions and exam-oriented practice. CI checks structure, **not factual accuracy**.
3. **Full curriculum coverage:** The 48 PDF assets and note JSON set do not necessarily cover every official unit and lesson across every programme, elective and semester. Diff the official CWIT R23 manifests against the interactive note catalog and create missing units/topics without guesswork.
4. **Complete app acceptance:** Revisit Tutor, Planner, Quiz, Revision, Analytics, profile/roles, Lessons, Materials, mobile, accessibility and error states with signed-in students. Existing build/unit/E2E green checks are useful but do not certify that all product promises are complete.
5. **Deployment:** Confirm that Vercel's `lernioai` project has successfully deployed `main`. Verify `/api/auth/providers` callbacks point at the live origin and test signup/signin/session plus Materials with a disposable student.
6. **Dependency advisories:** Production packages were patched; issue #58 tracks an unpatched development-only `braces` advisory via the Next ESLint toolchain.

## Release acceptance criteria

- [ ] Auth works on the actual public host (not only CI/preview).
- [ ] All relevant semester subjects have navigable PDF or lesson notes with no 404 routes.
- [ ] Each official topic has an academically accurate article (not generic template filler).
- [ ] Every advertised lesson video is direct, playable, matched and reviewed; pending videos display an honest safe state.
- [ ] Desktop and 360–390px mobile routes pass keyboard, overflow, contrast and loading/error checks.
- [ ] Migrations, lint, types, unit, build, Playwright, curriculum/content validation and blocking production-security audit pass.
- [ ] Notes content has a subject-by-subject reviewer sign-off, not just a generated word count.

## Recommended order

1. Land the verified auth and Materials foundation, then manually smoke-test production.
2. Rewrite high-use Semester 3 subjects first; extend to all semesters with explicit academic review.
3. Build a reviewer queue for direct videos, publish approved matches progressively and display measured coverage.
4. Close remaining workflow gaps by working through the end-to-end acceptance matrix.

**Status distinction:** Code changes being committed are not the same as deployed features; discoverable YouTube results are not approved instructional videos; machine-generated notes are not automatically academically complete.
