-- Learning OS remediation foundation.
-- Additive publication, ordering, elective and lesson-quiz linkage fields.

ALTER TABLE "Subject"
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Unit"
  ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "publishedById" TEXT;

ALTER TABLE "Topic"
  ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "publishedById" TEXT;

ALTER TABLE "Lesson"
  ALTER COLUMN "status" SET DEFAULT 'draft';

CREATE TABLE "StudentElectiveSelection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "electiveGroupId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "selectedById" TEXT,
  "sourceEvidence" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentElectiveSelection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassElectiveAllocation" (
  "id" TEXT NOT NULL,
  "classGroupId" TEXT NOT NULL,
  "electiveGroupId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "allocatedById" TEXT,
  "sourceEvidence" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClassElectiveAllocation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "QuizAttempt"
  ADD COLUMN "lessonId" TEXT;

CREATE UNIQUE INDEX "StudentElectiveSelection_userId_electiveGroupId_key"
  ON "StudentElectiveSelection"("userId", "electiveGroupId");
CREATE INDEX "StudentElectiveSelection_subjectId_status_idx"
  ON "StudentElectiveSelection"("subjectId", "status");
CREATE INDEX "StudentElectiveSelection_electiveGroupId_status_idx"
  ON "StudentElectiveSelection"("electiveGroupId", "status");

CREATE UNIQUE INDEX "ClassElectiveAllocation_classGroupId_electiveGroupId_key"
  ON "ClassElectiveAllocation"("classGroupId", "electiveGroupId");
CREATE INDEX "ClassElectiveAllocation_subjectId_status_idx"
  ON "ClassElectiveAllocation"("subjectId", "status");
CREATE INDEX "ClassElectiveAllocation_electiveGroupId_status_idx"
  ON "ClassElectiveAllocation"("electiveGroupId", "status");

CREATE INDEX "Subject_schemeId_semesterId_displayOrder_idx"
  ON "Subject"("schemeId", "semesterId", "displayOrder");
CREATE INDEX "Unit_subjectId_status_reviewStatus_idx"
  ON "Unit"("subjectId", "status", "reviewStatus");
CREATE INDEX "Topic_unitId_status_reviewStatus_idx"
  ON "Topic"("unitId", "status", "reviewStatus");
CREATE INDEX "QuizAttempt_lessonId_status_idx"
  ON "QuizAttempt"("lessonId", "status");

ALTER TABLE "StudentElectiveSelection"
  ADD CONSTRAINT "StudentElectiveSelection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentElectiveSelection"
  ADD CONSTRAINT "StudentElectiveSelection_electiveGroupId_fkey"
  FOREIGN KEY ("electiveGroupId") REFERENCES "ElectiveGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentElectiveSelection"
  ADD CONSTRAINT "StudentElectiveSelection_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassElectiveAllocation"
  ADD CONSTRAINT "ClassElectiveAllocation_classGroupId_fkey"
  FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassElectiveAllocation"
  ADD CONSTRAINT "ClassElectiveAllocation_electiveGroupId_fkey"
  FOREIGN KEY ("electiveGroupId") REFERENCES "ElectiveGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassElectiveAllocation"
  ADD CONSTRAINT "ClassElectiveAllocation_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizAttempt"
  ADD CONSTRAINT "QuizAttempt_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
