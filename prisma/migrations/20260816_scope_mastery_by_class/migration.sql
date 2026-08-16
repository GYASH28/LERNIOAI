-- Mastery must distinguish Class 11 and Class 12, especially for JEE droppers.
ALTER TABLE "AcademicMasteryRecord"
  ADD COLUMN IF NOT EXISTS "classLevel" TEXT;

-- If an earlier transformation database already contains mastery records,
-- recover the class from the user's latest matching academic question attempt.
UPDATE "AcademicMasteryRecord" AS mastery
SET "classLevel" = COALESCE(
  (
    SELECT question."classLevel"
    FROM "AcademicQuestionAttempt" AS attempt
    JOIN "AcademicQuestion" AS question ON question."id" = attempt."questionId"
    WHERE attempt."userId" = mastery."userId"
      AND question."subjectSlug" = mastery."subjectSlug"
      AND question."chapterSlug" = mastery."chapterSlug"
      AND COALESCE(question."topicSlug", '') = COALESCE(mastery."topicSlug", '')
    ORDER BY attempt."createdAt" DESC
    LIMIT 1
  ),
  '12'
)
WHERE mastery."classLevel" IS NULL;

ALTER TABLE "AcademicMasteryRecord"
  ALTER COLUMN "classLevel" SET NOT NULL;

DROP INDEX IF EXISTS "AcademicMasteryRecord_scope_key";
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicMasteryRecord_scope_key"
  ON "AcademicMasteryRecord"("userId", "classLevel", "subjectSlug", "chapterSlug", "topicSlug");

CREATE INDEX IF NOT EXISTS "AcademicMasteryRecord_user_class_mastery_idx"
  ON "AcademicMasteryRecord"("userId", "classLevel", "masteryScore");
