# Learning OS Content Operations Runbook

Date: 2026-06-29

## Curriculum Review

1. Regenerate extraction reports:

```bash
npm run curriculum:extract-units
npm run curriculum:unit-review-queue
npm run curriculum:extract-catalog
npm run curriculum:extract-timetable
```

2. Review `content/curriculum/cwit-r23/extraction-reports/official-unit-candidate-review-queue.json`.
3. Promote only rows whose unit order, titles and source pages have been manually verified.
4. Keep CIOT Semester 3-6 blocked until official semester-placement evidence is available.

## YouTube Review

1. Generate/verify candidates:

```bash
npm run content:import:youtube-guides -- --sem12 content-import/CWIT_Semester_1_2_YouTube_Lecture_Links.pdf --sem36 content-import/CWIT_Semester_3_to_6_YouTube_Lecture_Links.pdf --dry-run
npm run resources:youtube:candidates
npm run resources:youtube:verify
npm run resources:youtube:review-queue
npm run resources:link-health
```

2. Use YouTube Data API only when `YOUTUBE_API_KEY` is configured.
3. Do not publish playlist-level candidates until individual videos, embeddability, duration, language, captions and lesson fit are reviewed.
4. Prepare reviewed lesson-mapping decisions only after verified lessons exist. The decision file can be either `{ "decisions": [...] }` or a raw array:

```json
{
  "decisions": [
    {
      "candidateId": "ytcand_ready",
      "subjectCode": "R23CP1401",
      "lessonId": "lesson_database_id",
      "decision": "draft",
      "role": "primary_video",
      "sourceEvidence": "Reviewer playback and CWIT PDF page evidence."
    }
  ]
}
```

5. Dry-run the promotion against the database:

```bash
npx tsx scripts/promote-youtube-candidate-mappings.ts --decisions path/to/reviewed-youtube-mappings.json
```

6. Write only after reviewer approval and with a real reviewer/admin user id:

```bash
npx tsx scripts/promote-youtube-candidate-mappings.ts --decisions path/to/reviewed-youtube-mappings.json --write --actor-user-id <reviewer_user_id>
```

7. The admin API mirrors the same guardrails at `POST /api/admin/resources/youtube-candidates/promote`; it dry-runs by default and writes only with `?write=1`.
8. Approved lesson mappings must create governed `Resource` and `LessonResource` rows.
9. Broken primary videos must be replaced or ranked below approved alternates.

## Lesson Notes

1. Generate content only from approved curriculum, approved resources and reviewed transcript/caption summaries.
2. Validate note JSON with:

```bash
npm run notes:validate
```

3. Render reviewer artifacts with:

```bash
npm run notes:render-pdf
```

4. Store approved HTML/PDF artifacts in object storage.
5. Publish only after reviewer approval and audit logging.

## Publication Rules

- Draft curriculum, resources, questions and generated documents are hidden from normal students.
- Reviewer/admin preview must be authority-scoped.
- Every publish, unpublish, reject, replacement and regeneration action needs an audit event.
