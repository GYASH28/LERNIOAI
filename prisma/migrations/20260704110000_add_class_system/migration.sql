-- ============================================================
-- Class System (lightweight) — first-class class entity
-- Adds: Class, ClassMember, ClassAnnouncement, ClassTimetable
-- Plus reverse relations on User (classAsCR, classMembers, etc.)
-- ============================================================

-- Class entity: one row per (departmentCode, semesterNumber, division)
CREATE TABLE "Class" (
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
    "updatedAt"       TIMESTAMP(3)   NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Class_departmentCode_semesterNumber_division_key" ON "Class"("departmentCode", "semesterNumber", "division");
CREATE UNIQUE INDEX "Class_crId_key" ON "Class"("crId");
CREATE INDEX "Class_departmentCode_semesterNumber_idx" ON "Class"("departmentCode", "semesterNumber");

ALTER TABLE "Class" ADD CONSTRAINT "Class_crId_fkey"
    FOREIGN KEY ("crId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ClassMember: many-to-many between User and Class
CREATE TABLE "ClassMember" (
    "id"        TEXT   NOT NULL,
    "classId"   TEXT   NOT NULL,
    "userId"    TEXT   NOT NULL,
    "joinedAt"  TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassMember_classId_userId_key" ON "ClassMember"("classId", "userId");
CREATE INDEX "ClassMember_userId_idx" ON "ClassMember"("userId");

ALTER TABLE "ClassMember" ADD CONSTRAINT "ClassMember_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassMember" ADD CONSTRAINT "ClassMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ClassAnnouncement: posts by CR/teacher/admin to a class
CREATE TABLE "ClassAnnouncement" (
    "id"           TEXT   NOT NULL,
    "classId"      TEXT   NOT NULL,
    "authorId"     TEXT   NOT NULL,
    "title"        TEXT   NOT NULL,
    "body"         TEXT   NOT NULL,
    "pinned"       BOOLEAN NOT NULL DEFAULT false,
    "pinnedUntil"  TIMESTAMP(3),
    "archivedAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)   NOT NULL,

    CONSTRAINT "ClassAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClassAnnouncement_classId_createdAt_idx" ON "ClassAnnouncement"("classId", "createdAt");
CREATE INDEX "ClassAnnouncement_classId_pinned_pinnedUntil_idx" ON "ClassAnnouncement"("classId", "pinned", "pinnedUntil");
CREATE INDEX "ClassAnnouncement_authorId_idx" ON "ClassAnnouncement"("authorId");

ALTER TABLE "ClassAnnouncement" ADD CONSTRAINT "ClassAnnouncement_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassAnnouncement" ADD CONSTRAINT "ClassAnnouncement_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ClassTimetable: weekly schedule slots per class
CREATE TABLE "ClassTimetable" (
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
    "updatedAt"    TIMESTAMP(3)   NOT NULL,

    CONSTRAINT "ClassTimetable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassTimetable_classId_dayOfWeek_periodIndex_key" ON "ClassTimetable"("classId", "dayOfWeek", "periodIndex");
CREATE INDEX "ClassTimetable_classId_dayOfWeek_idx" ON "ClassTimetable"("classId", "dayOfWeek");
CREATE INDEX "ClassTimetable_teacherId_dayOfWeek_idx" ON "ClassTimetable"("teacherId", "dayOfWeek");

ALTER TABLE "ClassTimetable" ADD CONSTRAINT "ClassTimetable_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassTimetable" ADD CONSTRAINT "ClassTimetable_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
