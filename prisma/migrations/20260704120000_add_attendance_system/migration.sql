-- ============================================================
-- Attendance System — AttendanceSession + AttendanceRecord (Idempotent Fix)
-- ============================================================

-- AttendanceSession: one per class meeting where attendance was taken
CREATE TABLE IF NOT EXISTS "AttendanceSession" (
    "id"              TEXT   NOT NULL,
    "takenById"       TEXT   NOT NULL,
    "departmentCode"  TEXT   NOT NULL,
    "semesterNumber"  INTEGER NOT NULL,
    "division"        TEXT   NOT NULL,
    "subjectCode"     TEXT,
    "subjectName"     TEXT,
    "date"            TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalStudents"   INTEGER NOT NULL DEFAULT 0,
    "presentCount"    INTEGER NOT NULL DEFAULT 0,
    "absentCount"     INTEGER NOT NULL DEFAULT 0,
    "notes"           TEXT,
    "createdAt"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AttendanceSession_departmentCode_semesterNumber_division_date_idx" ON "AttendanceSession"("departmentCode", "semesterNumber", "division", "date");
CREATE INDEX IF NOT EXISTS "AttendanceSession_takenById_createdAt_idx" ON "AttendanceSession"("takenById", "createdAt");

-- AddForeignKey
ALTER TABLE "AttendanceSession" DROP CONSTRAINT IF EXISTS "AttendanceSession_takenById_fkey";
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_takenById_fkey"
    FOREIGN KEY ("takenById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AttendanceRecord: one per student per session
CREATE TABLE IF NOT EXISTS "AttendanceRecord" (
    "id"        TEXT   NOT NULL,
    "sessionId" TEXT   NOT NULL,
    "userId"    TEXT   NOT NULL,
    "status"    TEXT   NOT NULL,
    "remark"    TEXT,
    "createdAt" TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_sessionId_userId_key" ON "AttendanceRecord"("sessionId", "userId");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_userId_createdAt_idx" ON "AttendanceRecord"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_sessionId_idx" ON "AttendanceRecord"("sessionId");

-- AddForeignKey
ALTER TABLE "AttendanceRecord" DROP CONSTRAINT IF EXISTS "AttendanceRecord_sessionId_fkey";
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendanceRecord" DROP CONSTRAINT IF EXISTS "AttendanceRecord_userId_fkey";
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
