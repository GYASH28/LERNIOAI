-- AlterTable
ALTER TABLE "InviteCode" ADD COLUMN     "authorityGrantId" TEXT;

-- AlterTable
ALTER TABLE "RoleRequest" ADD COLUMN     "authorityGrantId" TEXT;

-- AlterTable
ALTER TABLE "RoleAssignment" ADD COLUMN     "authorityGrantId" TEXT;

-- AlterTable
ALTER TABLE "TeachingAssignment" ADD COLUMN     "authorityGrantId" TEXT;

-- AlterTable
ALTER TABLE "ClassMembership" ADD COLUMN     "authorityGrantId" TEXT;

-- CreateTable
CREATE TABLE "AuthorityGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "institutionId" TEXT,
    "departmentId" TEXT,
    "departmentCode" TEXT,
    "programmeId" TEXT,
    "schemeId" TEXT,
    "semesterId" TEXT,
    "classGroupId" TEXT,
    "subjectId" TEXT,
    "createdById" TEXT,
    "revokedById" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "reason" TEXT,
    "source" TEXT,
    "scopeSummary" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthorityGrant_userId_status_role_idx" ON "AuthorityGrant"("userId", "status", "role");

-- CreateIndex
CREATE INDEX "AuthorityGrant_role_status_idx" ON "AuthorityGrant"("role", "status");

-- CreateIndex
CREATE INDEX "AuthorityGrant_institutionId_status_idx" ON "AuthorityGrant"("institutionId", "status");

-- CreateIndex
CREATE INDEX "AuthorityGrant_departmentId_status_idx" ON "AuthorityGrant"("departmentId", "status");

-- CreateIndex
CREATE INDEX "AuthorityGrant_departmentCode_status_idx" ON "AuthorityGrant"("departmentCode", "status");

-- CreateIndex
CREATE INDEX "AuthorityGrant_classGroupId_status_idx" ON "AuthorityGrant"("classGroupId", "status");

-- CreateIndex
CREATE INDEX "AuthorityGrant_subjectId_status_idx" ON "AuthorityGrant"("subjectId", "status");

-- CreateIndex
CREATE INDEX "AuthorityGrant_expiresAt_idx" ON "AuthorityGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "InviteCode_authorityGrantId_idx" ON "InviteCode"("authorityGrantId");

-- CreateIndex
CREATE INDEX "RoleRequest_authorityGrantId_idx" ON "RoleRequest"("authorityGrantId");

-- CreateIndex
CREATE INDEX "RoleAssignment_authorityGrantId_idx" ON "RoleAssignment"("authorityGrantId");

-- CreateIndex
CREATE INDEX "TeachingAssignment_authorityGrantId_idx" ON "TeachingAssignment"("authorityGrantId");

-- CreateIndex
CREATE INDEX "ClassMembership_authorityGrantId_idx" ON "ClassMembership"("authorityGrantId");

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_authorityGrantId_fkey" FOREIGN KEY ("authorityGrantId") REFERENCES "AuthorityGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleRequest" ADD CONSTRAINT "RoleRequest_authorityGrantId_fkey" FOREIGN KEY ("authorityGrantId") REFERENCES "AuthorityGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "AcademicScheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_authorityGrantId_fkey" FOREIGN KEY ("authorityGrantId") REFERENCES "AuthorityGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_authorityGrantId_fkey" FOREIGN KEY ("authorityGrantId") REFERENCES "AuthorityGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMembership" ADD CONSTRAINT "ClassMembership_authorityGrantId_fkey" FOREIGN KEY ("authorityGrantId") REFERENCES "AuthorityGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

