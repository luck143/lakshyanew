-- Strategy A: drop (tenantId, email) unique on User (legacy data has dup/empty emails),
-- and make Review.product optional to match nullable productId.
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_tenantId_email_key";
ALTER TABLE "Review" ALTER COLUMN "productId" DROP NOT NULL;
-- (Review.product relation cardinality handled by Prisma client; no DB change beyond column nullability)
