# ADR-002: Multi-Tenancy Model

**Status:** Proposed · **Date:** 2026-07-19

## Context
Old system is multi-tenant via domain resolution (`get_network_details(domain)` → settings JSON in a
`settings`/`domains` table; per-request global `$GLOBALS` state). A tenant = a "network" (educator/
org) with its own domain, branding, modules, and users.

## Decision
**Shared database, `tenant_id` column on every tenant-scoped table**, enforced by a request-scoped
tenant middleware/guard that injects `tenantId` into all queries. Tenant settings in a typed
`TenantSettings` table (replaces opaque JSON blob).

## Rationale
- Lakshya's tenant count is moderate; row-level tenancy is simpler to operate than DB-per-tenant and
  avoids cross-tenant analytics pain (ClickHouse already mixes tenants by `network` id).
- Mirrors existing mental model (`network` id is already threaded through queries).

## Consequences
- ✅ Single DB, easy reporting, simpler backups.
- ⚠️ Must never forget `tenantId` in a query → enforce via repository layer / Prisma middleware,
  plus tests that assert no cross-tenant leakage.
- 🔁 If a tenant needs hard isolation later, schema already has the key to partition/shard.

## Rejected
- DB-per-tenant: high ops cost, hard cross-tenant queries, overkill at current scale.
