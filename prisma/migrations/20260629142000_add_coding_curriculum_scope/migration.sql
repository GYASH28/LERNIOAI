-- Add optional curriculum and lesson scope to coding challenges and submissions.
-- Existing unlinked challenges remain visible as global published practice.

ALTER TABLE "CodingChallenge"
  ADD COLUMN "subjectId" TEXT,
  ADD COLUMN "unitId" TEXT,
  ADD COLUMN "topicId" TEXT,
  ADD COLUMN "lessonId" TEXT,
  ADD COLUMN "sourceEvidence" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "CodingSubmission"
  ADD COLUMN "subjectId" TEXT,
  ADD COLUMN "unitId" TEXT,
  ADD COLUMN "topicId" TEXT,
  ADD COLUMN "lessonId" TEXT;

CREATE INDEX "CodingChallenge_status_category_idx"
  ON "CodingChallenge"("status", "category");
CREATE INDEX "CodingChallenge_subjectId_status_idx"
  ON "CodingChallenge"("subjectId", "status");
CREATE INDEX "CodingChallenge_unitId_status_idx"
  ON "CodingChallenge"("unitId", "status");
CREATE INDEX "CodingChallenge_topicId_status_idx"
  ON "CodingChallenge"("topicId", "status");
CREATE INDEX "CodingChallenge_lessonId_status_idx"
  ON "CodingChallenge"("lessonId", "status");

CREATE INDEX "CodingSubmission_subjectId_createdAt_idx"
  ON "CodingSubmission"("subjectId", "createdAt");
CREATE INDEX "CodingSubmission_lessonId_createdAt_idx"
  ON "CodingSubmission"("lessonId", "createdAt");

ALTER TABLE "CodingChallenge"
  ADD CONSTRAINT "CodingChallenge_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodingChallenge"
  ADD CONSTRAINT "CodingChallenge_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodingChallenge"
  ADD CONSTRAINT "CodingChallenge_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodingChallenge"
  ADD CONSTRAINT "CodingChallenge_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CodingSubmission"
  ADD CONSTRAINT "CodingSubmission_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "CodingChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodingSubmission"
  ADD CONSTRAINT "CodingSubmission_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodingSubmission"
  ADD CONSTRAINT "CodingSubmission_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodingSubmission"
  ADD CONSTRAINT "CodingSubmission_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodingSubmission"
  ADD CONSTRAINT "CodingSubmission_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
