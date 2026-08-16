-- Lernio Class 11 / 12 / JEE transformation
-- New academic identity and learning-loop tables are intentionally separate
-- from the legacy diploma hierarchy so old programme/semester data cannot leak
-- into the new student experience.

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
CREATE UNIQUE INDEX IF NOT EXISTS "StudentAcademicProfile_userId_key" ON "StudentAcademicProfile"("userId");
CREATE INDEX IF NOT EXISTS "StudentAcademicProfile_board_classLevel_stream_idx" ON "StudentAcademicProfile"("board", "classLevel", "stream");
CREATE INDEX IF NOT EXISTS "StudentAcademicProfile_targetYear_idx" ON "StudentAcademicProfile"("targetYear");

CREATE TABLE IF NOT EXISTS "AcademicQuestion" (
  "id" TEXT NOT NULL,
  "board" TEXT NOT NULL DEFAULT 'CBSE',
  "classLevel" TEXT NOT NULL,
  "subjectSlug" TEXT NOT NULL,
  "chapterSlug" TEXT NOT NULL,
  "topicSlug" TEXT,
  "concept" TEXT,
  "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
  "examType" TEXT NOT NULL DEFAULT 'BOARDS',
  "questionType" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" JSONB,
  "correctAnswer" JSONB NOT NULL,
  "solution" TEXT NOT NULL,
  "explanation" TEXT,
  "hint" TEXT,
  "marks" INTEGER NOT NULL DEFAULT 1,
  "negativeMarks" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "estimatedTimeSeconds" INTEGER,
  "sourceType" TEXT NOT NULL,
  "sourceLabel" TEXT,
  "sourceYear" INTEGER,
  "sourceSession" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AcademicQuestion_lookup_idx" ON "AcademicQuestion"("board", "classLevel", "subjectSlug", "chapterSlug", "topicSlug");
CREATE INDEX IF NOT EXISTS "AcademicQuestion_exam_difficulty_idx" ON "AcademicQuestion"("examType", "difficulty", "isPublished");
CREATE INDEX IF NOT EXISTS "AcademicQuestion_source_idx" ON "AcademicQuestion"("sourceType", "sourceYear");

CREATE TABLE IF NOT EXISTS "AcademicQuestionAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "selectedAnswer" JSONB,
  "isCorrect" BOOLEAN,
  "timeTakenSeconds" INTEGER,
  "practiceMode" TEXT NOT NULL DEFAULT 'TOPIC',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicQuestionAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademicQuestionAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AcademicQuestionAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AcademicQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AcademicQuestionAttempt_user_created_idx" ON "AcademicQuestionAttempt"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AcademicQuestionAttempt_question_idx" ON "AcademicQuestionAttempt"("questionId");

CREATE TABLE IF NOT EXISTS "AcademicMistake" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "category" TEXT,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextReviewAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicMistake_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademicMistake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AcademicMistake_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AcademicQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicMistake_user_question_key" ON "AcademicMistake"("userId", "questionId");
CREATE INDEX IF NOT EXISTS "AcademicMistake_due_idx" ON "AcademicMistake"("userId", "nextReviewAt", "resolvedAt");

CREATE TABLE IF NOT EXISTS "AcademicMasteryRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subjectSlug" TEXT NOT NULL,
  "chapterSlug" TEXT NOT NULL,
  "topicSlug" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "correctAttempts" INTEGER NOT NULL DEFAULT 0,
  "accuracy" DOUBLE PRECISION,
  "masteryScore" DOUBLE PRECISION,
  "averageTimeSeconds" DOUBLE PRECISION,
  "lastPractisedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicMasteryRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademicMasteryRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicMasteryRecord_scope_key" ON "AcademicMasteryRecord"("userId", "subjectSlug", "chapterSlug", "topicSlug");
CREATE INDEX IF NOT EXISTS "AcademicMasteryRecord_user_mastery_idx" ON "AcademicMasteryRecord"("userId", "masteryScore");

CREATE TABLE IF NOT EXISTS "AcademicRevisionItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "subjectSlug" TEXT NOT NULL,
  "chapterSlug" TEXT,
  "topicSlug" TEXT,
  "sourceId" TEXT,
  "confidence" INTEGER,
  "difficulty" INTEGER NOT NULL DEFAULT 2,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "lastReviewedAt" TIMESTAMP(3),
  "intervalDays" INTEGER NOT NULL DEFAULT 1,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicRevisionItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademicRevisionItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AcademicRevisionItem_due_idx" ON "AcademicRevisionItem"("userId", "dueAt");

CREATE TABLE IF NOT EXISTS "AcademicExam" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "examType" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "targetYear" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicExam_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademicExam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AcademicExam_user_date_idx" ON "AcademicExam"("userId", "scheduledFor");

CREATE TABLE IF NOT EXISTS "AcademicStudyPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicStudyPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademicStudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AcademicStudyPlan_user_status_idx" ON "AcademicStudyPlan"("userId", "status");

CREATE TABLE IF NOT EXISTS "AcademicStudyTask" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  "subjectSlug" TEXT NOT NULL,
  "chapterSlug" TEXT,
  "topicSlug" TEXT,
  "targetHref" TEXT NOT NULL,
  "estimatedMinutes" INTEGER NOT NULL,
  "scheduledDate" DATE NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicStudyTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademicStudyTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AcademicStudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AcademicStudyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AcademicStudyTask_user_date_idx" ON "AcademicStudyTask"("userId", "scheduledDate", "completedAt");
