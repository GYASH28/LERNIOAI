ALTER TABLE "StudyTask"
  ADD COLUMN "lessonId" TEXT,
  ADD COLUMN "canonicalUrl" TEXT,
  ADD COLUMN "sourceReason" TEXT;

CREATE INDEX "StudyTask_lessonId_idx" ON "StudyTask"("lessonId");

ALTER TABLE "StudyTask"
  ADD CONSTRAINT "StudyTask_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
