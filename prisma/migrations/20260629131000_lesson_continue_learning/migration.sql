-- Persist scoped continue-learning visits from canonical lesson pages.
ALTER TABLE "LessonCompletion" ADD COLUMN "lastVisited" TIMESTAMP(3);
ALTER TABLE "LessonCompletion" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "LessonCompletion_userId_lastVisited_idx" ON "LessonCompletion"("userId", "lastVisited");
