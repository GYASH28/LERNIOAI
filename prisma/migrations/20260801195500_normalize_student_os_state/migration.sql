-- Dedicated, versioned Student OS state. Bookmark remains a temporary read/
-- write compatibility layer until production backfill has been observed.
CREATE TABLE "StudentStateRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "migratedFromLegacyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentStateRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentStateRecord_userId_key_key"
    ON "StudentStateRecord"("userId", "key");
CREATE INDEX "StudentStateRecord_userId_updatedAt_idx"
    ON "StudentStateRecord"("userId", "updatedAt");
CREATE INDEX "StudentStateRecord_userId_deletedAt_idx"
    ON "StudentStateRecord"("userId", "deletedAt");

ALTER TABLE "StudentStateRecord"
    ADD CONSTRAINT "StudentStateRecord_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "StudentStateRecord" (
    "id", "userId", "key", "valueJson", "version",
    "migratedFromLegacyAt", "createdAt", "updatedAt"
)
SELECT
    'state_' || "id", "userId", "resourceId", "label", 1,
    CURRENT_TIMESTAMP, "createdAt", CURRENT_TIMESTAMP
FROM "Bookmark"
WHERE "resourceType" = 'student_os_state'
  AND "label" IS NOT NULL
ON CONFLICT ("userId", "key") DO NOTHING;
