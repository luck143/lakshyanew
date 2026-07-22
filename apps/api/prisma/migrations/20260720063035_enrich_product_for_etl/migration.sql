-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "categories" JSONB,
ADD COLUMN     "compareAtPrice" DOUBLE PRECISION,
ADD COLUMN     "costPrice" DOUBLE PRECISION,
ADD COLUMN     "extra" JSONB,
ADD COLUMN     "gstPercent" DOUBLE PRECISION,
ADD COLUMN     "images" JSONB,
ADD COLUMN     "subscriptionDays" INTEGER,
ADD COLUMN     "subscriptionType" TEXT;
