-- Lernio Class 11 / 12 / JEE transformation
-- Add the new academic identity without reusing diploma department/semester fields.

CREATE TABLE IF NOT EXISTS "StudentAcademicProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "board" TEXT NOT NULL DEFAULT 'CBSE',
  "classLevel" TEXT NOT NULL,
  "stream" TEXT NOT NULL,
  "targetExams" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "targetYear" INTEGER NOT NULL,
  "subjects" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "dailyStudyGoal" INTEGER NOT NULL DEFAULT 120,
  "preferredLearningStyle" TEXT,
  "strongSubjects" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "weakSubjects" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentAcademicProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentAcademicProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentAcademicProfile_userId_key"
  ON "StudentAcademicProfile"("userId");
CREATE INDEX IF NOT EXISTS "StudentAcademicProfile_board_classLevel_stream_idx"
  ON "StudentAcademicProfile"("board", "classLevel", "stream");
CREATE INDEX IF NOT EXISTS "StudentAcademicProfile_targetYear_idx"
  ON "StudentAcademicProfile"("targetYear");
