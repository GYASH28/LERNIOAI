# CWIT Learning OS content and video coverage

Research date: 2026-08-01

## Executive result

- Official curriculum coverage: **86 subjects, 403 units, 12 programme-semester partitions**.
- Official unit scope available in Materials: **403/403 units**.
- Student-facing official curriculum note layer: **86/86 subjects resolve in Learn and Materials**.
- Detailed official source layer: **83 subjects** have an official unit table or official course-level outcomes. Five CI subjects transparently use the matching CWIT CP shared-course table; one seminar subject has official course-level outcomes without a unit table.
- Three project/placement subjects (**R23CI5602, R23CP5401, R23CP5402**) have no unit or outcome table in the supplied official extraction. Lernio presents an explicit source-availability state for them rather than inventing study notes or videos.
- Current direct-video research pool: **293 pending candidates** from CWIT lecture-guide evidence and targeted allowed-channel research.
- Reconciled official-unit review queue: **287 pending direct-video candidates across 428 official lesson identities (67.1% candidate coverage)**.
- Candidates deliberately left unassigned after strict official-unit reconciliation: **6**. They are not shown to students and require a reviewer to find a more exact lesson fit.
- Official lessons without a reconciled pending candidate: **141**.
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

1. Start with exact detailed/fallback lesson identity.
2. Expand the 93 usable playlists from CWIT's own lecture-guide evidence into direct video IDs.
3. Search remaining lesson titles against the official subject context.
4. Keep only direct videos from the configured popular English/Hindi/Hinglish discovery pool.
5. Score title and official-scope overlap.
6. Allow only one candidate video per lesson and no duplicate video within a subject.
7. Write the result as `pending_review`; never auto-approve it.

The reconciliation report at `content/resources/lesson-video-mappings/cwit-r23-pending-video-reconciliation.json` now replaces legacy-note slugs with the official programme, semester, unit, lesson slug/title, matching terms, score, source provenance and a reviewer checklist. It permits one candidate per official lesson and one video per subject lesson assignment; it does not change the student-visible approved catalogue.

Every remaining uncovered official lesson is now represented in `content/resources/youtube-candidates/cwit-r23-missing-lesson-video-research-queue.json`. The protected `/admin/resources/youtube-candidates` page shows this queue with the exact CWIT scope and source pages, permitted-language policy, recommended popular channels, and a focused YouTube search link. It is a research handoff only: finding a result does not publish it.

| Programme | Semester | Reconciled pending candidates |
| --- | ---: | ---: |
| DCIOT | 1 | 13 |
| DCIOT | 2 | 21 |
| DCIOT | 3 | 33 |
| DCIOT | 4 | 33 |
| DCIOT | 5 | 38 |
| DCIOT | 6 | 8 |
| DCOMP | 1 | 11 |
| DCOMP | 2 | 21 |
| DCOMP | 3 | 34 |
| DCOMP | 4 | 19 |
| DCOMP | 5 | 30 |
| DCOMP | 6 | 26 |

The regenerated queue contains **209 English** and **78 Hindi** candidates (no other language is admitted). Channels represented include Gate Smashers, CodeWithHarry, Neso Academy, Jenny's Lectures CS IT, Ekeeda, Kharat Academy, Simplilearn, 5 Minutes Engineering, Education 4u, Easy Engineering Classes and freeCodeCamp.org.

## Why all videos are not published

Automated relevance is insufficient for a classroom product. The current environment has no `YOUTUBE_DATA_API_KEY`, and there is no named academic reviewer decision for these rows. Consequently Lernio cannot truthfully verify all of the following at publication time:

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
