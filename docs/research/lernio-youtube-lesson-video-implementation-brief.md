# Lernio YouTube Lesson-Video Research & Implementation Brief

Audited 1 August 2026. Repository: https://github.com/GYASH28/LERNIOAI (main).

Implementation refresh, 13 August 2026: research-candidate coverage is now **428/428 official lesson identities** across DCOMP and DCIOT semesters 1-6. All 428 direct IDs pass YouTube oEmbed identity lookup and remain draft-only in the protected review queue; named academic review is still required before any row becomes student-visible. See `docs/research/cwit-r23-complete-lesson-video-catalog.md` for the complete catalogue.

## Decision

Do not attach playlists to lessons. Lernio's active Learn direction defines a lesson as a playable, lesson-specific direct video. A lesson is covered only when it has one reviewed, embeddable direct video with a canonical lesson identity.

This is a release gate, not a preference: open PR 35 explicitly prohibits playlist/unrelated-video coverage. The current candidate data marks its playlist metadata, channel, duration, captions, age status and embeddability as unverified.

## GitHub audit

| Area | Evidence | Result |
|---|---|---|
| Scope | README reports 44 subjects, 6 semesters, 241 lessons. | Use the existing curriculum; do not make a parallel syllabus. |
| Curriculum | Files are under content/curriculum/cwit-r23/comp and content/curriculum/cwit-r23/ciot. | Programme, semester, subject, unit and lesson identity must originate here. |
| Granularity | Many manifests are structure_verified only, with empty lessons/topics and some visibly fragmented extracted unit titles. | Repair/review lesson structure before assigning direct videos. |
| Existing candidates | Candidate metadata has 102 unique YouTube source URLs from two CWIT lecture-guide PDFs. Most are playlists. | Treat them as research inputs, never direct Learn embeds. |
| Governance | Existing import, verify, review-queue and promotion scripts require a real reviewer/admin for writes. | Extend the governed pipeline; preserve source PDF/page evidence. |
| Data model | Resource, ResourceTopicMapping, ResourceReview and ReviewDecision support provenance, timestamps and review state. | Avoid a disconnected UI-only list. |
| Learn branch | PR 35 rebuilds Learn as video-first and lists direct-video coverage, CI and mobile QA as release gates. | Build on/rebase against PR 35; do not compete with its shared catalogue. |

### Relevant locations

- content/curriculum/cwit-r23/comp/semester-1.json through semester-6.json
- content/curriculum/cwit-r23/ciot/semester-1.json through semester-6.json
- content/resources/youtube-candidates/cwit-r23-youtube-candidates.metadata.json
- content/resources/youtube-candidates/cwit-r23-youtube-candidate-review-queue.json
- scripts/import-youtube-guides.ts
- scripts/verify-youtube-candidates.ts
- scripts/build-youtube-candidate-review-queue.ts
- scripts/promote-youtube-candidate-mappings.ts
- src/lib/resources/

## Approved-language research pool

Use only exact videos verified as English, Hindi or Hinglish. Channel language is not sufficient proof: manually check the selected video.

| Family | Hindi/Hinglish discovery channels | English discovery channels |
|---|---|---|
| Maths, science, electronics | Dr. Gajendra Purohit, Ekeeda, Last Moment Tuitions | Khan Academy, Neso Academy |
| Programming | CodeWithHarry, Apna College, WsCube Tech | freeCodeCamp.org, Programming with Mosh |
| DSA, DBMS, OS, networks, TOC | Gate Smashers, Jenny's Lectures CS IT, Knowledge Gate | Neso Academy, freeCodeCamp.org |
| Hardware, microprocessors, IoT | All About Electronics, Ekeeda | Neso Academy, All About Electronics |
| Cybersecurity, cloud, data analytics, ML | CodeWithHarry and Apna College only after topic/language review | freeCodeCamp.org, IBM Technology, Simplilearn |

Popularity is only a discovery aid. Approve a video only when it teaches the exact outcome, is direct and publicly embeddable, is classroom-safe, has accurate metadata, and has enough explanation plus an appropriate example/demo.

## One record per lesson

Every reviewed mapping must contain:

- Exact programmeCode, semesterNumber, subjectCode, unitNumber, lessonSlug and lessonTitle from the curriculum.
- role: primary_video, alternate_video or lab_demo.
- youtubeVideoId, canonicalUrl and privacy-enhanced embed URL. Never use a bare playlist as identity.
- Optional playlistId only for context.
- start/end timestamps whenever the selected lesson is a segment of a longer direct video.
- Verified title, channel, channel URL, published date and duration.
- spokenLanguage limited to en, hi or hinglish.
- Verified captions, embeddability, privacy, made-for-kids, age and region restriction states.
- coveragePercent, a lesson-specific rationale and reviewer evidence.
- reviewer, review timestamp, verification state and publication state.

One approved primary video maximum per lesson; up to two alternates. A missing mapping must display an honest review/pending state and must not redirect to any unrelated video.

## Publication process

1. Parse/review official CWIT R23 curriculum into stable units, topics and lessons. Correct malformed fragments first.
2. Preserve CWIT PDFs and playlist candidates as provenance. Use YouTube Data API/manual review to enumerate playlist items.
3. Research exact direct videos against canonical lessons. Capture direct IDs, language and timestamps.
4. Reject private, deleted, non-embeddable, region/age restricted or unsupported-language entries.
5. Academic reviewer confirms exact syllabus fit, pacing and timestamps.
6. Promote decisions through the existing review pipeline.
7. Publish a semester/programme only with a measured coverage report: approved, pending and blocked. Materials remains usable when video coverage is zero.

## Required data shape

{
  "programmeCode": "DCOMP",
  "semesterNumber": 3,
  "subjectCode": "R23CP...",
  "unitNumber": 2,
  "lessonSlug": "canonical-lesson-slug",
  "lessonTitle": "Exact manifest lesson title",
  "role": "primary_video",
  "youtubeVideoId": "DIRECT_VIDEO_ID",
  "canonicalUrl": "https://www.youtube.com/watch?v=DIRECT_VIDEO_ID",
  "playlistId": null,
  "startOffsetSeconds": 0,
  "endOffsetSeconds": null,
  "spokenLanguage": "hinglish",
  "channel": "Verified channel name",
  "durationSeconds": 0,
  "coveragePercent": 100,
  "whyThisVideo": "Exact syllabus-fit rationale",
  "reviewerEvidence": "Reviewed against unit outcome and player",
  "verificationStatus": "reviewed",
  "publicationStatus": "approved"
}

## Prompt for Codex

You are implementing reviewed, lesson-specific YouTube videos in GYASH28/LERNIOAI.

Read this file; all CWIT R23 semester manifests; existing candidate metadata/review queue; YouTube import/verify/review/promotion scripts; src/lib/resources; and the current shared Learn catalogue/PR 35.

Goal: publish only direct, reviewer-approved YouTube mappings for canonical lessons. Do not invent mappings, lesson titles, video IDs, durations, language, timestamps, embed status or coverage.

Requirements:

1. Use curriculum manifests as canonical identity. Repair/import missing or malformed official lesson structure before mapping any video.
2. Add a versioned reviewed mapping data set under content/resources/youtube-reviewed. One row per direct lesson-video mapping with all fields above. Keep playlists only as discovery context.
3. Extend validation to reject missing lesson identity, playlist-only URLs, invalid video IDs, languages other than en/hi/hinglish, non-approved state, non-embeddable/private/deleted/age/region-restricted videos, duplicate primaries, unsupported 100-percent coverage and unverified timestamps.
4. Preserve source PDF/page provenance and use existing Resource, ResourceTopicMapping, ResourceReview and ReviewDecision governance. Generate any static Learn catalogue from reviewed data and add a parity test.
5. In Learn, embed the primary direct video using youtube-nocookie; show verified channel/title/duration/language; support alternates and timestamped segments; retain progress/bookmarks/speed by direct video ID; pass exact context to Materials, Practice, Notebook and LEO; show an honest pending state for unmapped lessons.
6. Never redirect an unmapped lesson to a playlist, first video, or unrelated resource. Materials must work independently.
7. Add validation, catalogue parity, unmapped safe-state, direct-embed/resume, desktop and 360-390px mobile tests.
8. Run curriculum validation, YouTube verification/review queue, lint, typecheck, tests, production build and targeted Playwright Learn/mobile tests. Report commands/results.
9. Do not promote rows requiring a real reviewer/admin identity unless supplied. Build a review queue instead.
10. Deliver data, code, tests, coverage report and a PR summary with remaining gaps.

## Release checklist

- Official lessons are canonical and not malformed.
- Every published lesson has a direct video ID, language/metadata review and human academic approval.
- Mapped count means approved direct videos, never playlist count.
- Materials remains available when video coverage is zero.
- CI plus deployed 360-390px mobile QA complete.

## References

- https://github.com/GYASH28/LERNIOAI
- https://github.com/GYASH28/LERNIOAI/pull/35
- https://github.com/GYASH28/LERNIOAI/blob/main/README.md
- https://github.com/GYASH28/LERNIOAI/blob/main/content/resources/youtube-candidates/cwit-r23-youtube-candidates.metadata.json
- https://github.com/GYASH28/LERNIOAI/blob/main/content/resources/youtube-candidates/cwit-r23-youtube-candidate-review-queue.json
- https://cwit.mespune.org/wp-content/uploads/2021/07/COMPUTER-MPECS-23-CURRICULUM.pdf
