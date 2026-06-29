-- CreateTable
CREATE TABLE "LessonResource" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "startSeconds" INTEGER,
    "endSeconds" INTEGER,
    "coveragePercentage" INTEGER,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sourceEvidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoChapter" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startSeconds" INTEGER NOT NULL,
    "endSeconds" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "transcriptSnippet" TEXT,
    "sourceEvidence" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedLessonDocument" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "outputResourceId" TEXT,
    "documentType" TEXT NOT NULL DEFAULT 'lesson_notes',
    "sourceVideoResourceIds" TEXT,
    "sourceTranscriptHash" TEXT,
    "curriculumSourceIds" TEXT,
    "templateVersion" TEXT NOT NULL,
    "aiProvider" TEXT,
    "aiModel" TEXT,
    "generationStatus" TEXT NOT NULL DEFAULT 'draft',
    "validationResults" TEXT,
    "reviewerId" TEXT,
    "publisherId" TEXT,
    "generatedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "storageObjectKey" TEXT,
    "htmlObjectKey" TEXT,
    "thumbnailObjectKey" TEXT,
    "pageCount" INTEGER,
    "contentHash" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedLessonDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentGenerationJob" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "generatedDocumentId" TEXT,
    "jobType" TEXT NOT NULL DEFAULT 'lesson_notes',
    "state" TEXT NOT NULL DEFAULT 'queued',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT,
    "model" TEXT,
    "templateVersion" TEXT,
    "inputSummaryJson" TEXT,
    "validationJson" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "requestedById" TEXT,
    "reviewedById" TEXT,
    "publishedById" TEXT,
    "leaseOwner" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCompletionCriteria" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "requiredResourceRoles" TEXT,
    "minimumVideoPercent" INTEGER NOT NULL DEFAULT 0,
    "requirePractice" BOOLEAN NOT NULL DEFAULT false,
    "requireQuizPass" BOOLEAN NOT NULL DEFAULT false,
    "minimumQuizScore" INTEGER,
    "requireExplicitDone" BOOLEAN NOT NULL DEFAULT true,
    "criteriaJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonCompletionCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoWatchProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "lastSecond" INTEGER NOT NULL DEFAULT 0,
    "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
    "watchPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoWatchProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonResource_lessonId_resourceId_role_key" ON "LessonResource"("lessonId", "resourceId", "role");

-- CreateIndex
CREATE INDEX "LessonResource_lessonId_role_status_idx" ON "LessonResource"("lessonId", "role", "status");

-- CreateIndex
CREATE INDEX "LessonResource_resourceId_idx" ON "LessonResource"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoChapter_resourceId_startSeconds_title_key" ON "VideoChapter"("resourceId", "startSeconds", "title");

-- CreateIndex
CREATE INDEX "VideoChapter_resourceId_status_idx" ON "VideoChapter"("resourceId", "status");

-- CreateIndex
CREATE INDEX "GeneratedLessonDocument_lessonId_documentType_generationStatus_idx" ON "GeneratedLessonDocument"("lessonId", "documentType", "generationStatus");

-- CreateIndex
CREATE INDEX "GeneratedLessonDocument_outputResourceId_idx" ON "GeneratedLessonDocument"("outputResourceId");

-- CreateIndex
CREATE INDEX "GeneratedLessonDocument_contentHash_idx" ON "GeneratedLessonDocument"("contentHash");

-- CreateIndex
CREATE INDEX "ContentGenerationJob_state_updatedAt_idx" ON "ContentGenerationJob"("state", "updatedAt");

-- CreateIndex
CREATE INDEX "ContentGenerationJob_lessonId_jobType_idx" ON "ContentGenerationJob"("lessonId", "jobType");

-- CreateIndex
CREATE INDEX "ContentGenerationJob_generatedDocumentId_idx" ON "ContentGenerationJob"("generatedDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonCompletionCriteria_lessonId_key" ON "LessonCompletionCriteria"("lessonId");

-- CreateIndex
CREATE INDEX "LessonCompletionCriteria_status_idx" ON "LessonCompletionCriteria"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VideoWatchProgress_userId_lessonId_resourceId_key" ON "VideoWatchProgress"("userId", "lessonId", "resourceId");

-- CreateIndex
CREATE INDEX "VideoWatchProgress_lessonId_resourceId_idx" ON "VideoWatchProgress"("lessonId", "resourceId");

-- CreateIndex
CREATE INDEX "VideoWatchProgress_userId_updatedAt_idx" ON "VideoWatchProgress"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "LessonResource" ADD CONSTRAINT "LessonResource_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonResource" ADD CONSTRAINT "LessonResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoChapter" ADD CONSTRAINT "VideoChapter_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedLessonDocument" ADD CONSTRAINT "GeneratedLessonDocument_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedLessonDocument" ADD CONSTRAINT "GeneratedLessonDocument_outputResourceId_fkey" FOREIGN KEY ("outputResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGenerationJob" ADD CONSTRAINT "ContentGenerationJob_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGenerationJob" ADD CONSTRAINT "ContentGenerationJob_generatedDocumentId_fkey" FOREIGN KEY ("generatedDocumentId") REFERENCES "GeneratedLessonDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletionCriteria" ADD CONSTRAINT "LessonCompletionCriteria_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoWatchProgress" ADD CONSTRAINT "VideoWatchProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoWatchProgress" ADD CONSTRAINT "VideoWatchProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoWatchProgress" ADD CONSTRAINT "VideoWatchProgress_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
