-- Audit fix #22 (CVSS 4.5): Add missing database indexes.
-- Previously these indexes were applied via `prisma db push` which does NOT
-- create a migration file. This caused schema drift: the production DB had
-- the indexes but the migration history did not reflect them. Future
-- `prisma migrate deploy` runs would not apply them to a fresh DB.
--
-- This migration creates the indexes formally so they are tracked.
-- If you already applied them via `prisma db push`, mark this migration
-- as applied WITHOUT running the SQL:
--
--   INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count, logs)
--   VALUES (gen_random_uuid(), '', '20260701000001_add_missing_indexes', NOW(), 0, 'Applied via prisma db push — marked as applied to resolve schema drift');

CREATE INDEX IF NOT EXISTS "UserTopicMastery_userId_state_idx" ON "UserTopicMastery"("userId", "state");
CREATE INDEX IF NOT EXISTS "LessonCompletion_completedAt_idx" ON "LessonCompletion"("completedAt");
CREATE INDEX IF NOT EXISTS "LessonCompletion_userId_completedAt_idx" ON "LessonCompletion"("userId", "completedAt");
CREATE INDEX IF NOT EXISTS "QuestionAttempt_userId_isCorrect_idx" ON "QuestionAttempt"("userId", "isCorrect");
CREATE INDEX IF NOT EXISTS "QuizAttempt_userId_subjectId_completedAt_idx" ON "QuizAttempt"("userId", "subjectId", "completedAt");
CREATE INDEX IF NOT EXISTS "RevisionAttempt_userId_scheduleId_idx" ON "RevisionAttempt"("userId", "scheduleId");
CREATE INDEX IF NOT EXISTS "RevisionAttempt_userId_createdAt_idx" ON "RevisionAttempt"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "RevisionAttempt_scheduleId_idx" ON "RevisionAttempt"("scheduleId");
CREATE INDEX IF NOT EXISTS "StudySession_userId_startedAt_idx" ON "StudySession"("userId", "startedAt");
CREATE INDEX IF NOT EXISTS "StudySession_userId_subjectId_startedAt_idx" ON "StudySession"("userId", "subjectId", "startedAt");
CREATE INDEX IF NOT EXISTS "StudySession_userId_activity_idx" ON "StudySession"("userId", "activity");
