CREATE INDEX "TutorMessage_sessionId_createdAt_idx" ON "TutorMessage"("sessionId", "createdAt");
CREATE INDEX "CodingSubmission_userId_createdAt_idx" ON "CodingSubmission"("userId", "createdAt");
CREATE INDEX "CodingSubmission_challengeId_createdAt_idx" ON "CodingSubmission"("challengeId", "createdAt");
