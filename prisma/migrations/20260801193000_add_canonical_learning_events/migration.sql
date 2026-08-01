-- Canonical, append-only evidence for connected learning features.
CREATE TABLE "LearningEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "programmeCode" TEXT,
    "semesterNumber" INTEGER,
    "subjectId" TEXT,
    "unitNumber" INTEGER,
    "lessonId" TEXT,
    "sourceRoute" TEXT NOT NULL,
    "payloadJson" TEXT,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearningEvent_userId_idempotencyKey_key"
    ON "LearningEvent"("userId", "idempotencyKey");
CREATE INDEX "LearningEvent_userId_occurredAt_idx"
    ON "LearningEvent"("userId", "occurredAt");
CREATE INDEX "LearningEvent_userId_type_occurredAt_idx"
    ON "LearningEvent"("userId", "type", "occurredAt");
CREATE INDEX "LearningEvent_lessonId_type_idx"
    ON "LearningEvent"("lessonId", "type");
CREATE INDEX "LearningEvent_subjectId_type_idx"
    ON "LearningEvent"("subjectId", "type");

ALTER TABLE "LearningEvent"
    ADD CONSTRAINT "LearningEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
