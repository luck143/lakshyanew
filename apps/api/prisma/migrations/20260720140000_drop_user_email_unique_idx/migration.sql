-- Strategy A: remove the unique INDEX on (tenantId, email) for User.
-- Legacy data has duplicate/empty emails; the index must go (the @@unique was
-- removed from the schema, but its backing index was not auto-dropped by our
-- hand-written migration).
DROP INDEX IF EXISTS "User_tenantId_email_key";
