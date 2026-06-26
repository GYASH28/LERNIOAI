-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "category" TEXT,
ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "officialUrl" TEXT,
ADD COLUMN     "sourceVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "Programme" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "durationSemesters" INTEGER,
ADD COLUMN     "intake" INTEGER,
ADD COLUMN     "intakeNote" TEXT,
ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "AcademicScheme" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "effectiveFrom" TIMESTAMP(3),
ADD COLUMN     "effectiveTo" TIMESTAMP(3),
ADD COLUMN     "publishedVersionId" TEXT,
ADD COLUMN     "revisionLabel" TEXT,
ADD COLUMN     "sourceCoverage" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "assessmentMetadata" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "courseCatalogId" TEXT,
ADD COLUMN     "electiveGroupId" TEXT,
ADD COLUMN     "lectureHours" INTEGER,
ADD COLUMN     "practicalHours" INTEGER,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "sourceEvidence" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "totalHours" INTEGER,
ADD COLUMN     "tutorialHours" INTEGER;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "outcomes" TEXT,
ADD COLUMN     "sourceEvidence" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "outcomes" TEXT,
ADD COLUMN     "sourceEvidence" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "changeSummary" TEXT,
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "parentVersionId" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedById" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "sourceCompleteness" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedById" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "learningOutcomeIds" TEXT,
ADD COLUMN     "publishedById" TEXT,
ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'unreviewed',
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "sourceEvidence" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "InviteCode" ADD COLUMN     "classGroupId" TEXT,
ADD COLUMN     "deliveryStatus" TEXT,
ADD COLUMN     "institutionId" TEXT,
ADD COLUMN     "lastSentAt" TIMESTAMP(3),
ADD COLUMN     "lastUsedIpHash" TEXT,
ADD COLUMN     "programmeId" TEXT,
ADD COLUMN     "schemeId" TEXT,
ADD COLUMN     "subjectId" TEXT,
ADD COLUMN     "useEvents" TEXT;

-- AlterTable
ALTER TABLE "RoleRequest" ADD COLUMN     "classGroupId" TEXT,
ADD COLUMN     "decisionRubric" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "evidenceAttachments" TEXT,
ADD COLUMN     "institutionId" TEXT,
ADD COLUMN     "programmeId" TEXT,
ADD COLUMN     "requestedExpiresAt" TIMESTAMP(3),
ADD COLUMN     "schemeId" TEXT,
ADD COLUMN     "semesterId" TEXT,
ADD COLUMN     "subjectId" TEXT;

-- AlterTable
ALTER TABLE "RoleAssignment" ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "restoredAt" TIMESTAMP(3),
ADD COLUMN     "restoredById" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedById" TEXT;

-- AlterTable
ALTER TABLE "TeachingAssignment" ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "revokedById" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ClassMembership" ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "afterSummary" TEXT,
ADD COLUMN     "beforeSummary" TEXT,
ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "retentionUntil" TIMESTAMP(3),
ADD COLUMN     "riskLevel" TEXT;

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "creator" TEXT,
ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lastMetadataCheckAt" TIMESTAMP(3),
ADD COLUMN     "license" TEXT,
ADD COLUMN     "linkHealth" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "moderationStatus" TEXT NOT NULL DEFAULT 'clear',
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "qualityRubricJson" TEXT,
ADD COLUMN     "qualityScore" INTEGER,
ADD COLUMN     "redirectUrl" TEXT,
ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "sourceTrust" TEXT,
ADD COLUMN     "thumbnailUrl" TEXT;

-- CreateTable
CREATE TABLE "CourseCatalog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "canonicalTitle" TEXT NOT NULL,
    "discipline" TEXT,
    "description" TEXT,
    "keywords" TEXT,
    "aliases" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sourceEvidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectiveGroup" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "departmentId" TEXT,
    "programmeId" TEXT,
    "schemeId" TEXT,
    "semesterId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "minSelect" INTEGER NOT NULL DEFAULT 1,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sourceEvidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectiveGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectiveOption" (
    "id" TEXT NOT NULL,
    "electiveGroupId" TEXT NOT NULL,
    "subjectId" TEXT,
    "label" TEXT NOT NULL,
    "code" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sourceEvidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectiveOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectApplicability" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "institutionId" TEXT,
    "departmentId" TEXT,
    "programmeId" TEXT,
    "schemeId" TEXT,
    "semesterId" TEXT,
    "classGroupId" TEXT,
    "applicabilityType" TEXT NOT NULL DEFAULT 'offering',
    "status" TEXT NOT NULL DEFAULT 'active',
    "sourceEvidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectApplicability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseOutcome" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "bloomLevel" TEXT,
    "sourceEvidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeOutcome" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "sourceEvidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgrammeOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutcomeMapping" (
    "id" TEXT NOT NULL,
    "courseOutcomeId" TEXT,
    "programmeOutcomeId" TEXT,
    "subjectId" TEXT,
    "strength" TEXT NOT NULL DEFAULT 'introduced',
    "sourceEvidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutcomeMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalExperiment" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "unitId" TEXT,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "apparatus" TEXT,
    "software" TEXT,
    "procedure" TEXT,
    "resultRubric" TEXT,
    "safety" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "sourceEvidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticalExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendedReference" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "unitId" TEXT,
    "topicId" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publisher" TEXT,
    "edition" TEXT,
    "isbn" TEXT,
    "url" TEXT,
    "referenceType" TEXT NOT NULL DEFAULT 'book',
    "sourceEvidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendedReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusDocument" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT,
    "programmeId" TEXT,
    "schemeId" TEXT,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "objectKey" TEXT,
    "revisionLabel" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "checksum" TEXT,
    "mimeType" TEXT,
    "pageCount" INTEGER,
    "trustLevel" TEXT NOT NULL DEFAULT 'official',
    "status" TEXT NOT NULL DEFAULT 'registered',
    "uploadedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyllabusDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceSnapshot" (
    "id" TEXT NOT NULL,
    "syllabusDocumentId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "objectKey" TEXT,
    "checksum" TEXT NOT NULL,
    "mimeType" TEXT,
    "byteSize" INTEGER,
    "pageCount" INTEGER,
    "fetchStatus" TEXT NOT NULL DEFAULT 'stored',
    "fetchMetadata" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "SourceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusImportJob" (
    "id" TEXT NOT NULL,
    "syllabusDocumentId" TEXT NOT NULL,
    "sourceSnapshotId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'queued',
    "parserVersion" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "leaseOwner" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "logs" TEXT,
    "warnings" TEXT,
    "errorCode" TEXT,
    "extractedJson" TEXT,
    "normalizedDraftJson" TEXT,
    "resultSummary" TEXT,
    "requestedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyllabusImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportFinding" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "rowKey" TEXT,
    "fieldPath" TEXT,
    "confidence" DOUBLE PRECISION,
    "resolutionStatus" TEXT NOT NULL DEFAULT 'open',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumVersion" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT,
    "programmeId" TEXT,
    "schemeId" TEXT,
    "subjectId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "parentVersionId" TEXT,
    "sourceSnapshotId" TEXT,
    "semanticDiffJson" TEXT,
    "changeSummary" TEXT,
    "createdById" TEXT,
    "submittedById" TEXT,
    "reviewedById" TEXT,
    "publishedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceTopicMapping" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "coverageType" TEXT NOT NULL DEFAULT 'explains',
    "coveragePercent" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startOffsetSeconds" INTEGER,
    "endOffsetSeconds" INTEGER,
    "mappingNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewerEvidence" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceTopicMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceProvider" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "baseUrl" TEXT,
    "policyJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastHealthCheckAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceReview" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "decision" TEXT NOT NULL DEFAULT 'pending',
    "rubricJson" TEXT,
    "note" TEXT,
    "evidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "decision" TEXT NOT NULL,
    "note" TEXT,
    "rubricJson" TEXT,
    "priorStatus" TEXT,
    "nextStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentBlueprint" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unitScopeJson" TEXT,
    "difficultyDistribution" TEXT,
    "marksDistribution" TEXT,
    "questionTypeDistribution" TEXT,
    "outcomeScopeJson" TEXT,
    "validationSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormalAssessment" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "snapshotJson" TEXT,
    "createdById" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormalAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAssignment" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "classGroupId" TEXT,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceTarget" (
    "id" TEXT NOT NULL,
    "noticeId" TEXT NOT NULL,
    "institutionId" TEXT,
    "departmentId" TEXT,
    "programmeId" TEXT,
    "schemeId" TEXT,
    "semesterId" TEXT,
    "classGroupId" TEXT,
    "subjectId" TEXT,
    "role" TEXT,

    CONSTRAINT "AudienceTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'queued',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "leaseOwner" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "inputJson" TEXT,
    "outputJson" TEXT,
    "errorCode" TEXT,
    "logs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationHealth" (
    "id" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latencyMs" INTEGER,
    "message" TEXT,
    "metadata" TEXT,

    CONSTRAINT "IntegrationHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "filterJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'queued',
    "filterJson" TEXT,
    "objectKey" TEXT,
    "expiresAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "institutionId" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'all',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercent" INTEGER,
    "cohortJson" TEXT,
    "description" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseCatalog_discipline_active_idx" ON "CourseCatalog"("discipline", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CourseCatalog_institutionId_canonicalTitle_key" ON "CourseCatalog"("institutionId", "canonicalTitle");

-- CreateIndex
CREATE INDEX "ElectiveGroup_schemeId_semesterId_status_idx" ON "ElectiveGroup"("schemeId", "semesterId", "status");

-- CreateIndex
CREATE INDEX "ElectiveGroup_programmeId_status_idx" ON "ElectiveGroup"("programmeId", "status");

-- CreateIndex
CREATE INDEX "ElectiveOption_subjectId_idx" ON "ElectiveOption"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectiveOption_electiveGroupId_code_key" ON "ElectiveOption"("electiveGroupId", "code");

-- CreateIndex
CREATE INDEX "SubjectApplicability_subjectId_status_idx" ON "SubjectApplicability"("subjectId", "status");

-- CreateIndex
CREATE INDEX "SubjectApplicability_programmeId_schemeId_semesterId_idx" ON "SubjectApplicability"("programmeId", "schemeId", "semesterId");

-- CreateIndex
CREATE INDEX "CourseOutcome_subjectId_status_idx" ON "CourseOutcome"("subjectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CourseOutcome_subjectId_code_key" ON "CourseOutcome"("subjectId", "code");

-- CreateIndex
CREATE INDEX "ProgrammeOutcome_programmeId_status_idx" ON "ProgrammeOutcome"("programmeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeOutcome_programmeId_code_key" ON "ProgrammeOutcome"("programmeId", "code");

-- CreateIndex
CREATE INDEX "OutcomeMapping_courseOutcomeId_idx" ON "OutcomeMapping"("courseOutcomeId");

-- CreateIndex
CREATE INDEX "OutcomeMapping_programmeOutcomeId_idx" ON "OutcomeMapping"("programmeOutcomeId");

-- CreateIndex
CREATE INDEX "OutcomeMapping_subjectId_status_idx" ON "OutcomeMapping"("subjectId", "status");

-- CreateIndex
CREATE INDEX "PracticalExperiment_subjectId_status_idx" ON "PracticalExperiment"("subjectId", "status");

-- CreateIndex
CREATE INDEX "PracticalExperiment_unitId_idx" ON "PracticalExperiment"("unitId");

-- CreateIndex
CREATE INDEX "RecommendedReference_subjectId_status_idx" ON "RecommendedReference"("subjectId", "status");

-- CreateIndex
CREATE INDEX "RecommendedReference_topicId_idx" ON "RecommendedReference"("topicId");

-- CreateIndex
CREATE INDEX "SyllabusDocument_institutionId_status_idx" ON "SyllabusDocument"("institutionId", "status");

-- CreateIndex
CREATE INDEX "SyllabusDocument_departmentId_status_idx" ON "SyllabusDocument"("departmentId", "status");

-- CreateIndex
CREATE INDEX "SyllabusDocument_programmeId_schemeId_idx" ON "SyllabusDocument"("programmeId", "schemeId");

-- CreateIndex
CREATE INDEX "SyllabusDocument_checksum_idx" ON "SyllabusDocument"("checksum");

-- CreateIndex
CREATE INDEX "SourceSnapshot_checksum_idx" ON "SourceSnapshot"("checksum");

-- CreateIndex
CREATE INDEX "SourceSnapshot_fetchStatus_fetchedAt_idx" ON "SourceSnapshot"("fetchStatus", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourceSnapshot_syllabusDocumentId_checksum_key" ON "SourceSnapshot"("syllabusDocumentId", "checksum");

-- CreateIndex
CREATE INDEX "SyllabusImportJob_state_updatedAt_idx" ON "SyllabusImportJob"("state", "updatedAt");

-- CreateIndex
CREATE INDEX "SyllabusImportJob_syllabusDocumentId_createdAt_idx" ON "SyllabusImportJob"("syllabusDocumentId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportFinding_importJobId_severity_idx" ON "ImportFinding"("importJobId", "severity");

-- CreateIndex
CREATE INDEX "ImportFinding_resolutionStatus_idx" ON "ImportFinding"("resolutionStatus");

-- CreateIndex
CREATE INDEX "CurriculumVersion_schemeId_status_idx" ON "CurriculumVersion"("schemeId", "status");

-- CreateIndex
CREATE INDEX "CurriculumVersion_subjectId_status_idx" ON "CurriculumVersion"("subjectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumVersion_schemeId_subjectId_version_key" ON "CurriculumVersion"("schemeId", "subjectId", "version");

-- CreateIndex
CREATE INDEX "ResourceTopicMapping_topicId_status_idx" ON "ResourceTopicMapping"("topicId", "status");

-- CreateIndex
CREATE INDEX "ResourceTopicMapping_resourceId_status_idx" ON "ResourceTopicMapping"("resourceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceTopicMapping_resourceId_topicId_coverageType_key" ON "ResourceTopicMapping"("resourceId", "topicId", "coverageType");

-- CreateIndex
CREATE INDEX "ResourceProvider_status_idx" ON "ResourceProvider"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceProvider_institutionId_key_key" ON "ResourceProvider"("institutionId", "key");

-- CreateIndex
CREATE INDEX "ResourceReview_resourceId_createdAt_idx" ON "ResourceReview"("resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "ResourceReview_decision_createdAt_idx" ON "ResourceReview"("decision", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewDecision_entityType_entityId_idx" ON "ReviewDecision"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ReviewDecision_decision_createdAt_idx" ON "ReviewDecision"("decision", "createdAt");

-- CreateIndex
CREATE INDEX "AssessmentBlueprint_subjectId_status_idx" ON "AssessmentBlueprint"("subjectId", "status");

-- CreateIndex
CREATE INDEX "FormalAssessment_subjectId_status_idx" ON "FormalAssessment"("subjectId", "status");

-- CreateIndex
CREATE INDEX "FormalAssessment_opensAt_closesAt_idx" ON "FormalAssessment"("opensAt", "closesAt");

-- CreateIndex
CREATE INDEX "AssessmentAssignment_assessmentId_status_idx" ON "AssessmentAssignment"("assessmentId", "status");

-- CreateIndex
CREATE INDEX "AssessmentAssignment_classGroupId_status_idx" ON "AssessmentAssignment"("classGroupId", "status");

-- CreateIndex
CREATE INDEX "AssessmentAssignment_userId_status_idx" ON "AssessmentAssignment"("userId", "status");

-- CreateIndex
CREATE INDEX "Notice_status_startsAt_idx" ON "Notice"("status", "startsAt");

-- CreateIndex
CREATE INDEX "AudienceTarget_noticeId_idx" ON "AudienceTarget"("noticeId");

-- CreateIndex
CREATE INDEX "AudienceTarget_institutionId_role_idx" ON "AudienceTarget"("institutionId", "role");

-- CreateIndex
CREATE INDEX "JobRun_jobType_state_idx" ON "JobRun"("jobType", "state");

-- CreateIndex
CREATE INDEX "JobRun_state_updatedAt_idx" ON "JobRun"("state", "updatedAt");

-- CreateIndex
CREATE INDEX "IntegrationHealth_providerKey_checkedAt_idx" ON "IntegrationHealth"("providerKey", "checkedAt");

-- CreateIndex
CREATE INDEX "SavedView_userId_area_idx" ON "SavedView"("userId", "area");

-- CreateIndex
CREATE INDEX "ExportJob_userId_state_idx" ON "ExportJob"("userId", "state");

-- CreateIndex
CREATE INDEX "ExportJob_expiresAt_idx" ON "ExportJob"("expiresAt");

-- CreateIndex
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_institutionId_environment_key" ON "FeatureFlag"("key", "institutionId", "environment");

-- CreateIndex
CREATE INDEX "Subject_courseCatalogId_idx" ON "Subject"("courseCatalogId");

-- CreateIndex
CREATE INDEX "Subject_electiveGroupId_idx" ON "Subject"("electiveGroupId");

-- CreateIndex
CREATE INDEX "Subject_schemeId_status_idx" ON "Subject"("schemeId", "status");

-- CreateIndex
CREATE INDEX "Lesson_status_updatedAt_idx" ON "Lesson"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Lesson_createdById_idx" ON "Lesson"("createdById");

-- CreateIndex
CREATE INDEX "Question_subjectId_status_idx" ON "Question"("subjectId", "status");

-- CreateIndex
CREATE INDEX "Question_reviewStatus_idx" ON "Question"("reviewStatus");

-- CreateIndex
CREATE INDEX "InviteCode_institutionId_role_idx" ON "InviteCode"("institutionId", "role");

-- CreateIndex
CREATE INDEX "InviteCode_departmentCode_role_idx" ON "InviteCode"("departmentCode", "role");

-- CreateIndex
CREATE INDEX "RoleRequest_institutionId_status_idx" ON "RoleRequest"("institutionId", "status");

-- CreateIndex
CREATE INDEX "RoleRequest_departmentId_status_idx" ON "RoleRequest"("departmentId", "status");

-- CreateIndex
CREATE INDEX "RoleRequest_subjectId_status_idx" ON "RoleRequest"("subjectId", "status");

-- CreateIndex
CREATE INDEX "AuditEvent_requestId_idx" ON "AuditEvent"("requestId");

-- CreateIndex
CREATE INDEX "AuditEvent_correlationId_idx" ON "AuditEvent"("correlationId");

-- CreateIndex
CREATE INDEX "Resource_provider_externalId_idx" ON "Resource"("provider", "externalId");

-- CreateIndex
CREATE INDEX "Resource_canonicalUrl_idx" ON "Resource"("canonicalUrl");

-- CreateIndex
CREATE INDEX "Resource_reviewStatus_linkHealth_idx" ON "Resource"("reviewStatus", "linkHealth");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_courseCatalogId_fkey" FOREIGN KEY ("courseCatalogId") REFERENCES "CourseCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_electiveGroupId_fkey" FOREIGN KEY ("electiveGroupId") REFERENCES "ElectiveGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCatalog" ADD CONSTRAINT "CourseCatalog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectiveOption" ADD CONSTRAINT "ElectiveOption_electiveGroupId_fkey" FOREIGN KEY ("electiveGroupId") REFERENCES "ElectiveGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectiveOption" ADD CONSTRAINT "ElectiveOption_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOutcome" ADD CONSTRAINT "CourseOutcome_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalExperiment" ADD CONSTRAINT "PracticalExperiment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalExperiment" ADD CONSTRAINT "PracticalExperiment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendedReference" ADD CONSTRAINT "RecommendedReference_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendedReference" ADD CONSTRAINT "RecommendedReference_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendedReference" ADD CONSTRAINT "RecommendedReference_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_syllabusDocumentId_fkey" FOREIGN KEY ("syllabusDocumentId") REFERENCES "SyllabusDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusImportJob" ADD CONSTRAINT "SyllabusImportJob_syllabusDocumentId_fkey" FOREIGN KEY ("syllabusDocumentId") REFERENCES "SyllabusDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportFinding" ADD CONSTRAINT "ImportFinding_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "SyllabusImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceTopicMapping" ADD CONSTRAINT "ResourceTopicMapping_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceTopicMapping" ADD CONSTRAINT "ResourceTopicMapping_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReview" ADD CONSTRAINT "ResourceReview_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceTarget" ADD CONSTRAINT "AudienceTarget_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
