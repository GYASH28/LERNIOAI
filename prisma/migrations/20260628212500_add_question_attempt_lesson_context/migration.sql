-- Add optional lesson context for practice evidence launched from canonical lessons.
ALTER TABLE "QuestionAttempt" ADD COLUMN "lessonId" TEXT;

ALTER TABLE "QuestionAttempt"
  ADD CONSTRAINT "QuestionAttempt_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "QuestionAttempt_lessonId_idx" ON "QuestionAttempt"("lessonId");
