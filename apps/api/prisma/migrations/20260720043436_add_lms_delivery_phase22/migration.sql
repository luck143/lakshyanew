-- CreateTable
CREATE TABLE "LiveClass" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructor" TEXT,
    "link" TEXT,
    "image" TEXT,
    "datetime" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 0,
    "subject" TEXT,
    "topicId" TEXT,
    "series" TEXT,
    "session" TEXT,
    "recordings" JSONB,
    "tags" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoList" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topicId" TEXT,
    "vid" TEXT,
    "ytVid" TEXT,
    "hlsVid" TEXT,
    "mirrors" JSONB,
    "content" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "length" INTEGER NOT NULL DEFAULT 0,
    "ecomPlan" JSONB,
    "tags" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "qid" TEXT,
    "uid" TEXT,
    "name" TEXT,
    "email" TEXT,
    "comment" TEXT NOT NULL,
    "url" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "upvote" INTEGER NOT NULL DEFAULT 0,
    "downvote" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrentAffairs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT,
    "date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrentAffairs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveClass_tenantId_topicId_idx" ON "LiveClass"("tenantId", "topicId");

-- CreateIndex
CREATE INDEX "LiveClass_tenantId_status_idx" ON "LiveClass"("tenantId", "status");

-- CreateIndex
CREATE INDEX "VideoList_tenantId_topicId_idx" ON "VideoList"("tenantId", "topicId");

-- CreateIndex
CREATE INDEX "VideoList_tenantId_status_idx" ON "VideoList"("tenantId", "status");

-- CreateIndex
CREATE INDEX "QuizComment_tenantId_qid_idx" ON "QuizComment"("tenantId", "qid");

-- CreateIndex
CREATE INDEX "QuizComment_tenantId_status_idx" ON "QuizComment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CurrentAffairs_tenantId_status_idx" ON "CurrentAffairs"("tenantId", "status");
