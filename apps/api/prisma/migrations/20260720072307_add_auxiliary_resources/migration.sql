-- CreateTable
CREATE TABLE "BlogCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legacyId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "image" TEXT,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legacyId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "comment" TEXT NOT NULL,
    "postId" TEXT,
    "authorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AskQuestion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legacyId" TEXT,
    "question" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AskQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaiseProblem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legacyId" TEXT,
    "issue" TEXT,
    "problem" TEXT,
    "quizId" TEXT,
    "url" TEXT,
    "userName" TEXT,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaiseProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessStory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legacyId" TEXT,
    "name" TEXT NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "image" TEXT,
    "tags" TEXT[],
    "brand" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessStory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlogCategory_tenantId_status_idx" ON "BlogCategory"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BlogComment_tenantId_postId_idx" ON "BlogComment"("tenantId", "postId");

-- CreateIndex
CREATE INDEX "BlogComment_tenantId_status_idx" ON "BlogComment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AskQuestion_tenantId_status_idx" ON "AskQuestion"("tenantId", "status");

-- CreateIndex
CREATE INDEX "RaiseProblem_tenantId_status_idx" ON "RaiseProblem"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SuccessStory_tenantId_status_idx" ON "SuccessStory"("tenantId", "status");
