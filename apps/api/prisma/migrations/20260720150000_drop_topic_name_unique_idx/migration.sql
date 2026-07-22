-- Strategy A: drop the (tenantId, name) unique INDEX on Topic.
-- Legacy topic names collide under a tenant, so the index must go.
-- Strategy A identity is `id` (old PK verbatim); `name` is no longer a unique key.
DROP INDEX IF EXISTS "Topic_tenantId_name_key";
