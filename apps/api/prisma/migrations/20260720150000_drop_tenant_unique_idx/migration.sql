-- Strategy A: drop (tenantId, X) UNIQUE INDEXES that legacy data violates
-- (duplicate names/slugs/codes/keys under a tenant). Strategy A identity is
-- `id` (old PK verbatim); these were non-identity uniques that abort
-- the migration on the first collision. Same class as User.email / Topic.name.
DROP INDEX IF EXISTS "Role_tenantId_key_key";
DROP INDEX IF EXISTS "BlogPost_tenantId_slug_key";
DROP INDEX IF EXISTS "Category_tenantId_slug_key";
DROP INDEX IF EXISTS "Product_tenantId_slug_key";
DROP INDEX IF EXISTS "Coupon_tenantId_code_key";
DROP INDEX IF EXISTS "Setting_tenantId_key_key";
