# CWIT Learning OS content and video coverage

Research date: 2026-08-01

## Executive result

- Official curriculum coverage: **86 subjects, 403 units, 12 programme-semester partitions**.
- Official unit scope available in Materials: **403/403 units**.
- Rich reviewed lesson-note documents: **44 subjects / 241 detailed lessons**.
- Subjects still using the official-scope fallback instead of a rich reviewed pack: **42**.
- Direct lesson-video research queue: **300 pending mappings across 433 detailed/fallback lesson identities (69.3% candidate coverage)**.
- Lessons with no suitable pending candidate yet: **133**.
- Reviewer-approved direct videos visible to students: **0**.

The candidate number is intentionally not presented as completed Learn coverage. A candidate is hidden until a named academic reviewer checks the exact CWIT outcome, spoken language, duration, player restrictions, embeddability, classroom suitability and availability.

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

Channels represented in the current queue include Gate Smashers, CodeWithHarry, Neso Academy, Jenny's Lectures CS IT, Ekeeda, Kharat Academy, Simplilearn, 5 Minutes Engineering, Education 4u, Easy Engineering Classes and freeCodeCamp.org.

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
