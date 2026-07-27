-- YouTube Playlist Intelligence
CREATE TABLE "YouTubePlaylist" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channelName" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "subjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "YouTubePlaylist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "YouTubePlaylist_playlistId_key" ON "YouTubePlaylist"("playlistId");
CREATE INDEX "YouTubePlaylist_subjectId_idx" ON "YouTubePlaylist"("subjectId");
CREATE INDEX "YouTubePlaylist_syncStatus_idx" ON "YouTubePlaylist"("syncStatus");

CREATE TABLE "PlaylistVideoItem" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "durationSeconds" INTEGER,
    "description" TEXT,
    "playlistPosition" INTEGER NOT NULL,
    "resourceId" TEXT,
    "classificationStatus" TEXT NOT NULL DEFAULT 'unclassified',
    "matchedLessonId" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "classificationRationale" TEXT,
    "classifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlaylistVideoItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlaylistVideoItem_playlistId_videoId_key" ON "PlaylistVideoItem"("playlistId", "videoId");
CREATE INDEX "PlaylistVideoItem_playlistId_playlistPosition_idx" ON "PlaylistVideoItem"("playlistId", "playlistPosition");
CREATE INDEX "PlaylistVideoItem_classificationStatus_idx" ON "PlaylistVideoItem"("classificationStatus");
CREATE INDEX "PlaylistVideoItem_matchedLessonId_idx" ON "PlaylistVideoItem"("matchedLessonId");
ALTER TABLE "PlaylistVideoItem" ADD CONSTRAINT "PlaylistVideoItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "YouTubePlaylist"("id") ON DELETE CASCADE;

-- Session-wise lesson structure
CREATE TABLE "LessonSession" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 10,
    "generationStatus" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LessonSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LessonSession_lessonId_sessionType_key" ON "LessonSession"("lessonId", "sessionType");
CREATE INDEX "LessonSession_lessonId_order_idx" ON "LessonSession"("lessonId", "order");
CREATE INDEX "LessonSession_generationStatus_idx" ON "LessonSession"("generationStatus");
ALTER TABLE "LessonSession" ADD CONSTRAINT "LessonSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE;

-- Flashcards
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "hint" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "generationStatus" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Flashcard_lessonId_order_idx" ON "Flashcard"("lessonId", "order");
CREATE INDEX "Flashcard_generationStatus_idx" ON "Flashcard"("generationStatus");
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE;

CREATE TABLE "FlashcardProgress" (
    "id" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReviewed" TIMESTAMP(3),
    "nextDue" TIMESTAMP(3),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FlashcardProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FlashcardProgress_flashcardId_userId_key" ON "FlashcardProgress"("flashcardId", "userId");
CREATE INDEX "FlashcardProgress_userId_nextDue_idx" ON "FlashcardProgress"("userId", "nextDue");
ALTER TABLE "FlashcardProgress" ADD CONSTRAINT "FlashcardProgress_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE;
ALTER TABLE "FlashcardProgress" ADD CONSTRAINT "FlashcardProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Session Progress
CREATE TABLE "SessionProgress" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SessionProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SessionProgress_sessionId_userId_key" ON "SessionProgress"("sessionId", "userId");
CREATE INDEX "SessionProgress_userId_completed_idx" ON "SessionProgress"("userId", "completed");
ALTER TABLE "SessionProgress" ADD CONSTRAINT "SessionProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LessonSession"("id") ON DELETE CASCADE;
ALTER TABLE "SessionProgress" ADD CONSTRAINT "SessionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Community: Posts
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "groupId" TEXT,
    "subjectId" TEXT,
    "topicId" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "postType" TEXT NOT NULL DEFAULT 'freeform',
    "status" TEXT NOT NULL DEFAULT 'published',
    "reports" INTEGER NOT NULL DEFAULT 0,
    "moderatorNote" TEXT,
    "reviewerId" TEXT,
    "aiFlagged" BOOLEAN NOT NULL DEFAULT false,
    "aiFlagReason" TEXT,
    "bestAnswerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommunityPost_section_status_createdAt_idx" ON "CommunityPost"("section", "status", "createdAt");
CREATE INDEX "CommunityPost_authorId_createdAt_idx" ON "CommunityPost"("authorId", "createdAt");
CREATE INDEX "CommunityPost_subjectId_status_idx" ON "CommunityPost"("subjectId", "status");
CREATE INDEX "CommunityPost_groupId_status_idx" ON "CommunityPost"("groupId", "status");
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Community: Comments
CREATE TABLE "CommunityComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "reports" INTEGER NOT NULL DEFAULT 0,
    "moderatorNote" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "isBestAnswer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommunityComment_postId_status_createdAt_idx" ON "CommunityComment"("postId", "status", "createdAt");
CREATE INDEX "CommunityComment_authorId_createdAt_idx" ON "CommunityComment"("authorId", "createdAt");
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE;
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Community: Votes
CREATE TABLE "CommunityVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityVote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommunityVote_userId_commentId_key" ON "CommunityVote"("userId", "commentId");
CREATE INDEX "CommunityVote_commentId_idx" ON "CommunityVote"("commentId");
ALTER TABLE "CommunityVote" ADD CONSTRAINT "CommunityVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "CommunityVote" ADD CONSTRAINT "CommunityVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE;

-- Community: Groups
CREATE TABLE "CommunityGroup" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT,
    "semesterNumber" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityGroup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommunityGroup_subjectId_semesterNumber_idx" ON "CommunityGroup"("subjectId", "semesterNumber");
CREATE INDEX "CommunityGroup_visibility_idx" ON "CommunityGroup"("visibility");
ALTER TABLE "CommunityGroup" ADD CONSTRAINT "CommunityGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE;

-- Community: Group Memberships
CREATE TABLE "CommunityGroupMembership" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityGroupMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommunityGroupMembership_groupId_userId_key" ON "CommunityGroupMembership"("groupId", "userId");
CREATE INDEX "CommunityGroupMembership_userId_idx" ON "CommunityGroupMembership"("userId");
ALTER TABLE "CommunityGroupMembership" ADD CONSTRAINT "CommunityGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup"("id") ON DELETE CASCADE;
ALTER TABLE "CommunityGroupMembership" ADD CONSTRAINT "CommunityGroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Community: Reports
CREATE TABLE "CommunityReport" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommunityReport_postId_createdAt_idx" ON "CommunityReport"("postId", "createdAt");
CREATE INDEX "CommunityReport_commentId_createdAt_idx" ON "CommunityReport"("commentId", "createdAt");
CREATE INDEX "CommunityReport_reporterId_createdAt_idx" ON "CommunityReport"("reporterId", "createdAt");
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Add group FK to CommunityPost (self-referencing relation)
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup"("id") ON DELETE SET NULL;
