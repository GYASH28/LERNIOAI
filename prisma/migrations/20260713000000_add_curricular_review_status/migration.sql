-- AlterTable: Add curricular review fields to LessonResource
ALTER TABLE "LessonResource" ADD COLUMN "curricularReviewStatus" TEXT NOT NULL DEFAULT 'unreviewed';
ALTER TABLE "LessonResource" ADD COLUMN "curricularReviewedAt" TIMESTAMP(3);
ALTER TABLE "LessonResource" ADD COLUMN "curricularReviewedBy" TEXT;

-- CreateIndex
CREATE INDEX "LessonResource_curricularReviewStatus_idx" ON "LessonResource"("curricularReviewStatus");
