-- Strategy A: add real domain fields + extra jsonb to models (ecom/LMS core migration).
-- All additions are nullable / have defaults so existing rows are unaffected.

ALTER TABLE "Product" ADD COLUMN "vendor" TEXT;
ALTER TABLE "Product" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Product" ADD COLUMN "examId" TEXT;

ALTER TABLE "Order" ADD COLUMN "title" TEXT;
ALTER TABLE "Order" ADD COLUMN "address" JSONB;
ALTER TABLE "Order" ADD COLUMN "buyerNote" TEXT;
ALTER TABLE "Order" ADD COLUMN "trackingLink" TEXT;
ALTER TABLE "Order" ADD COLUMN "subscriptionExpire" TIMESTAMPTZ;

ALTER TABLE "Review" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Review" ADD COLUMN "tags" TEXT[];
ALTER TABLE "Review" ADD COLUMN "extra" JSONB;
ALTER TABLE "Review" ADD COLUMN "videoId" TEXT;

ALTER TABLE "Coupon" ADD COLUMN "maxDiscountAmount" DOUBLE PRECISION;
ALTER TABLE "Coupon" ADD COLUMN "applyOn" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "image" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "banner" TEXT;

ALTER TABLE "Subscription" ADD COLUMN "productId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "videoId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "examId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "purchased" TIMESTAMPTZ;

ALTER TABLE "Ticket" ADD COLUMN "moduleId" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "extra" JSONB;

ALTER TABLE "Setting" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

ALTER TABLE "QuizSet" ADD COLUMN "examId" TEXT;
ALTER TABLE "QuizSet" ADD COLUMN "extra" JSONB;

ALTER TABLE "Note" ADD COLUMN "examId" TEXT;
ALTER TABLE "Note" ADD COLUMN "extra" JSONB;

ALTER TABLE "LiveClass" ADD COLUMN "extra" JSONB;

ALTER TABLE "VideoList" ADD COLUMN "examId" TEXT;
ALTER TABLE "VideoList" ADD COLUMN "extra" JSONB;

ALTER TABLE "QuizComment" ADD COLUMN "noteId" TEXT;

ALTER TABLE "AskQuestion" ADD COLUMN "extra" JSONB;

ALTER TABLE "RaiseProblem" ADD COLUMN "noteId" TEXT;

ALTER TABLE "Event" ADD COLUMN "extra" JSONB;

ALTER TABLE "Module" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Module" ADD COLUMN "extra" JSONB;

ALTER TABLE "Domain" ADD COLUMN "extra" JSONB;

ALTER TABLE "Category" ADD COLUMN "extra" JSONB;

ALTER TABLE "Topic" ADD COLUMN "extra" JSONB;
