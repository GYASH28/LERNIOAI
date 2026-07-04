-- ============================================================
-- Class System (lightweight) — first-class class entity (Idempotent Fix)
-- Adds: Class, ClassMember, ClassAnnouncement, ClassTimetable
-- Plus reverse relations on User (classAsCR, classMembers, etc.)
-- ============================================================

-- CreateTable Class (if not exists)
CREATE TABLE IF NOT EXISTS "Class" (
    "id"              TEXT   NOT NULL,
    "departmentCode"  TEXT   NOT NULL,
    "semesterNumber"  INTEGER NOT NULL,
    "division"        TEXT   NOT NULL,
    "crId"            TEXT,
    "academicYear"    TEXT,
    "room"            TEXT,
    "alias"           TEXT,
    "avatarEmoji"     TEXT,
    "avatarColor"     TEXT,
    "aliasUpdatedBy"  TEXT,
    "aliasUpdatedAt"  TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- AlterTable Class (to add missing columns if they don't exist)
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "room" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "alias" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "avatarEmoji" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "avatarColor" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "aliasUpdatedBy" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "aliasUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable ClassMember
CREATE TABLE IF NOT EXISTS "ClassMember" (
    "id"        TEXT   NOT NULL,
    "classId"   TEXT   NOT NULL,
    "userId"    TEXT   NOT NULL,
    "joinedAt"  TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClassAnnouncement
CREATE TABLE IF NOT EXISTS "ClassAnnouncement" (
    "id"           TEXT   NOT NULL,
    "classId"      TEXT   NOT NULL,
    "authorId"     TEXT   NOT NULL,
    "title"        TEXT   NOT NULL,
    "body"         TEXT   NOT NULL,
    "pinned"       BOOLEAN NOT NULL DEFAULT false,
    "pinnedUntil"  TIMESTAMP(3),
    "archivedAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClassTimetable
CREATE TABLE IF NOT EXISTS "ClassTimetable" (
    "id"           TEXT   NOT NULL,
    "classId"      TEXT   NOT NULL,
    "dayOfWeek"    INTEGER NOT NULL,
    "periodIndex"  INTEGER NOT NULL,
    "subjectName"  TEXT,
    "teacherId"    TEXT,
    "room"         TEXT,
    "startTime"    TEXT   NOT NULL,
    "endTime"      TEXT   NOT NULL,
    "isBreak"      BOOLEAN NOT NULL DEFAULT false,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassTimetable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Class_departmentCode_semesterNumber_division_key" ON "Class"("departmentCode", "semesterNumber", "division");
CREATE UNIQUE INDEX IF NOT EXISTS "Class_crId_key" ON "Class"("crId");
CREATE INDEX IF NOT EXISTS "Class_departmentCode_semesterNumber_idx" ON "Class"("departmentCode", "semesterNumber");

-- CreateIndex ClassMember
CREATE UNIQUE INDEX IF NOT EXISTS "ClassMember_classId_userId_key" ON "ClassMember"("classId", "userId");
CREATE INDEX IF NOT EXISTS "ClassMember_userId_idx" ON "ClassMember"("userId");

-- CreateIndex ClassAnnouncement
CREATE INDEX IF NOT EXISTS "ClassAnnouncement_classId_createdAt_idx" ON "ClassAnnouncement"("classId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClassAnnouncement_classId_pinned_pinnedUntil_idx" ON "ClassAnnouncement"("classId", "pinned", "pinnedUntil");
CREATE INDEX IF NOT EXISTS "ClassAnnouncement_authorId_idx" ON "ClassAnnouncement"("authorId");

-- CreateIndex ClassTimetable
CREATE UNIQUE INDEX IF NOT EXISTS "ClassTimetable_classId_dayOfWeek_periodIndex_key" ON "ClassTimetable"("classId", "dayOfWeek", "periodIndex");
CREATE INDEX IF NOT EXISTS "ClassTimetable_classId_dayOfWeek_idx" ON "ClassTimetable"("classId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "ClassTimetable_teacherId_dayOfWeek_idx" ON "ClassTimetable"("teacherId", "dayOfWeek");

-- AddForeignKey Constraints
ALTER TABLE "Class" DROP CONSTRAINT IF EXISTS "Class_crId_fkey";
ALTER TABLE "Class" ADD CONSTRAINT "Class_crId_fkey" FOREIGN KEY ("crId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClassMember" DROP CONSTRAINT IF EXISTS "ClassMember_classId_fkey";
ALTER TABLE "ClassMember" ADD CONSTRAINT "ClassMember_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassMember" DROP CONSTRAINT IF EXISTS "ClassMember_userId_fkey";
ALTER TABLE "ClassMember" ADD CONSTRAINT "ClassMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassAnnouncement" DROP CONSTRAINT IF EXISTS "ClassAnnouncement_classId_fkey";
ALTER TABLE "ClassAnnouncement" ADD CONSTRAINT "ClassAnnouncement_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassAnnouncement" DROP CONSTRAINT IF EXISTS "ClassAnnouncement_authorId_fkey";
ALTER TABLE "ClassAnnouncement" ADD CONSTRAINT "ClassAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassTimetable" DROP CONSTRAINT IF EXISTS "ClassTimetable_classId_fkey";
ALTER TABLE "ClassTimetable" ADD CONSTRAINT "ClassTimetable_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassTimetable" DROP CONSTRAINT IF EXISTS "ClassTimetable_teacherId_fkey";
ALTER TABLE "ClassTimetable" ADD CONSTRAINT "ClassTimetable_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
