ALTER TABLE "TutorMessage" ADD COLUMN "clientMessageId" TEXT;

CREATE UNIQUE INDEX "TutorMessage_sessionId_role_clientMessageId_key"
ON "TutorMessage"("sessionId", "role", "clientMessageId");
