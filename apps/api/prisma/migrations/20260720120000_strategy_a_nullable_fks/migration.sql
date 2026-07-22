-- Strategy A follow-up: make FK/email columns nullable where legacy data can be sparse.
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "userId" DROP NOT NULL;
