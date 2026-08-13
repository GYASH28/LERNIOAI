# CWIT Learning OS content and video coverage

Research date: 2026-08-01
Coverage refresh: 2026-08-13

## Executive result

- Official curriculum coverage: **86 subjects, 403 units, 12 programme-semester partitions**.
- Official unit scope available in Materials: **403/403 units**.
- Student-facing official curriculum note layer: **86/86 subjects resolve in Learn and Materials**.
- Detailed official source layer: **83 subjects** have an official unit table or official course-level outcomes. Five CI subjects transparently use the matching CWIT CP shared-course table; one seminar subject has official course-level outcomes without a unit table.
- Three project/placement subjects (**R23CI5602, R23CP5401, R23CP5402**) have no unit or outcome table in the supplied official extraction. Lernio presents an explicit source-availability state for them rather than inventing study notes or videos.
- Complete direct-video research pool: **428 pending primary candidates** plus **274 recorded alternates** from CWIT lecture-guide evidence and exact lesson research.
- Reconciled official-unit review queue: **428 pending direct-video candidates across 428 official lesson identities (100% candidate coverage)**.
- YouTube oEmbed identity/availability lookup: **428/428 found** on 2026-08-13. This is not the same as a reviewer testing the embedded player.
- Candidates deliberately left unassigned after strict official-unit reconciliation: **6**. They are not shown to students and require a reviewer to find a more exact lesson fit.
- Official lessons without a reconciled pending candidate: **0**.
- Reviewer-approved direct videos visible to students: **0**.

The candidate number is intentionally not presented as completed Learn coverage. A candidate is hidden until a named academic reviewer checks the exact CWIT outcome, spoken language, duration, player restrictions, embeddability, classroom suitability and availability.

## Note-source policy now enforced in Learn

The official CWIT R23 extraction is now the student-facing source of truth, including for the older Computer Engineering note packs. This removes generic or differently-structured legacy note content from the learning path. Every detailed official unit presents the extracted scope, learning outcomes, teaching hours, theory marks, mapped course outcome, source-page evidence, an outcome-linked self-check and an exam/revision checklist. Legacy JSON packs remain in the repository only for migration/audit history and are no longer allowed to broaden the official curriculum.

## Official sources

- Computer Engineering R23 curriculum: `https://cwit.mespune.org/wp-content/uploads/2021/07/COMPUTER-MPECS-23-CURRICULUM.pdf`
- Computer Engineering & IoT R23 curriculum: `https://cwit.mespune.org/wp-content/uploads/2023/07/IOTR23_ALL_Curriculam-FINALV.pdf`
- CWIT semester 1-2 YouTube lecture guide: `content-import/CWIT_Semester_1_2_YouTube_Lecture_Links.pdf`
- CWIT semester 3-6 YouTube lecture guide: `content-import/CWIT_Semester_3_to_6_YouTube_Lecture_Links.pdf`

## What the curriculum extraction contains

For every canonical subject/unit where CWIT provides the table, Lernio now stores:

- exact programme, semester and official subject code;
- cleaned unit heading;
- official topics/sub-topics text;
- official unit/learning outcomes;
- course outcomes;
- teaching hours, marks and mapped course outcome where present;
- exact PDF page evidence and official source URL;
- explicit extraction status.

The regression test rejects missing content and contamination from tutorial-title, ISBN or publisher tables.

## Video research method

1. Start with the exact official programme, semester, subject, unit and lesson identity.
2. Expand the 93 usable playlists from CWIT's own lecture-guide evidence into direct video IDs.
3. Search remaining lesson titles against the official subject context.
4. Keep only direct videos from the configured popular English/Hindi/Hinglish discovery pool.
5. Score title and official-scope overlap.
6. Allow only one candidate video per lesson and no duplicate video within a subject.
7. Run a second curriculum-specific pass for every remaining gap, keep one primary plus up to two alternates, and apply documented human curation overrides to demonstrably weak automated matches.
8. Verify every selected direct ID through YouTube oEmbed and write the result as `pending_review`; never auto-approve it.

The reconciliation report at `content/resources/lesson-video-mappings/cwit-r23-pending-video-reconciliation.json` now replaces legacy-note slugs with the official programme, semester, unit, lesson slug/title, matching terms, score, source provenance and a reviewer checklist. It permits one candidate per official lesson and one video per subject lesson assignment; it does not change the student-visible approved catalogue.

The former missing-lesson queue at `content/resources/youtube-candidates/cwit-r23-missing-lesson-video-research-queue.json` now reports zero research gaps. The newly researched rows and alternates are preserved in `content/resources/lesson-video-mappings/cwit-r23-researched-gap-video-mappings.json`, and documented manual corrections are preserved in `content/resources/lesson-video-mappings/cwit-r23-gap-video-curation-overrides.json`. The protected `/admin/resources/youtube-candidates` page now receives all 428 exact lesson candidates for review.

| Programme | Semester | Reconciled pending candidates |
| --- | ---: | ---: |
| DCIOT | 1 | 30 |
| DCIOT | 2 | 40 |
| DCIOT | 3 | 42 |
| DCIOT | 4 | 39 |
| DCIOT | 5 | 47 |
| DCIOT | 6 | 13 |
| DCOMP | 1 | 31 |
| DCOMP | 2 | 36 |
| DCOMP | 3 | 42 |
| DCOMP | 4 | 30 |
| DCOMP | 5 | 40 |
| DCOMP | 6 | 38 |

The regenerated queue contains **325 English estimates** and **103 Hindi estimates**; these values remain pending listening confirmation. Channels represented include Gate Smashers, CodeWithHarry, Neso Academy, Jenny's Lectures CS IT, Ekeeda, Kharat Academy, Simplilearn, 5 Minutes Engineering, Education 4u, Easy Engineering Classes, WsCube Tech, Dear Sir, Magnet Brains and freeCodeCamp.org. The full 428-row human-readable catalogue is `docs/research/cwit-r23-complete-lesson-video-catalog.md`.

## Why all videos are not published

Automated relevance and oEmbed identity checks are insufficient for a classroom product. There is no named academic reviewer decision for these rows. Consequently Lernio cannot truthfully verify all of the following at publication time:

- exact spoken language rather than title language;
- complete lesson/outcome fit and useful timestamps;
- current embeddability, privacy and deletion state;
- captions, duration, age/region restrictions and classroom safety;
- whether a higher-quality alternative exists.

The student catalogue therefore continues to show an honest pending/no-video state. The ordered fallback that previously risked displaying an unrelated video has been removed.

## Required reviewer workflow

For each row in `content/resources/lesson-video-mappings/cwit-r23-direct-video-mappings.json`:

1. Open the exact CWIT subject/unit/lesson context.
2. Watch enough of the direct video to verify syllabus fit and spoken language.
3. Record duration, embeddability, restrictions, captions and useful start/end timestamps.
4. Approve, reject, replace or mark no suitable video.
5. Save reviewer identity, rationale and timestamp.
6. Promote approved rows through the governed catalog; rerun integrity and link-health checks.

## Definition of complete video coverage

A lesson is complete only when its primary direct video is approved and currently playable. Playlist count, search result count and pending-candidate count never count as published coverage.
