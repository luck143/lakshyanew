-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "topicId" TEXT,
    "quesLevel" TEXT,
    "quesLang" TEXT NOT NULL DEFAULT 'english',
    "quesType" TEXT NOT NULL DEFAULT 'mcq',
    "question" TEXT NOT NULL,
    "answer" JSONB,
    "correctAns" TEXT,
    "solution" TEXT,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "quesTag" TEXT[],
    "examTag" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topicId" TEXT,
    "topicList" JSONB,
    "numQuiz" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "topicId" TEXT,
    "examType" TEXT[],
    "examGroup" TEXT[],
    "seoGroup" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topicId" TEXT,
    "body" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quiz_tenantId_topicId_idx" ON "Quiz"("tenantId", "topicId");

-- CreateIndex
CREATE INDEX "Quiz_tenantId_quesType_idx" ON "Quiz"("tenantId", "quesType");

-- CreateIndex
CREATE INDEX "Quiz_tenantId_status_idx" ON "Quiz"("tenantId", "status");

-- CreateIndex
CREATE INDEX "QuizSet_tenantId_topicId_idx" ON "QuizSet"("tenantId", "topicId");

-- CreateIndex
CREATE INDEX "QuizSet_tenantId_status_idx" ON "QuizSet"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Exam_tenantId_parentId_idx" ON "Exam"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "Exam_tenantId_status_idx" ON "Exam"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Note_tenantId_topicId_idx" ON "Note"("tenantId", "topicId");

-- CreateIndex
CREATE INDEX "Note_tenantId_status_idx" ON "Note"("tenantId", "status");
