# Architecture Overview (target)

See `MIGRATION_PLAN.md` for full narrative. This is the at-a-glance view.

## Components
- `apps/web`      — Next.js public site (SSR/ISR/CSR). SEO-critical.
- `apps/admin`    — Next.js admin console. Generic metadata-driven renderer.
- `apps/api`      — Next Route Handlers (ADR-001 Option A) OR promoted to NestJS later.
- `packages/core` — ResourceRegistry, field types, `defineResource`, generic controller, codegen.
- `packages/db`   — Prisma schema (source of truth) + clients.
- `packages/auth` — JWT (HS256 compat), RBAC, tenant middleware.
- `packages/ui-admin` — `ResourcePage`, `ResourceTable`, `ResourceForm`, `FieldRenderer`.
- `packages/ui-web`    — public design system (teal/amber tokens from DESIGN.md).
- `packages/codegen`   — registry → zod + TS types + API client + OpenAPI.

## Metadata loop (the core)
```
defineResource()  →  packages/core registry
        │
        ├─► codegen ─► zod (backend validation) + TS types + API client + OpenAPI
        │
        └─► runtime
              • API: generic controller exposes list/get/create/update/delete/bulk/meta
              • Admin: GET /api/meta/<resource> → ResourcePage renders table/form/filters
              • Public: webView metadata drives listings/landings
              • Docs: OpenAPI from same registry
```
One definition → API + admin UI + public + docs + types. Adding a resource = one declaration.

## Data
Postgres (OLTP, Prisma) · ClickHouse (analytics/events only) · Redis (cache/sessions) ·
Object storage (media) · Queue (BullMQ/Inngest) for jobs.

## Tenancy
`tenant_id` column + request-scoped middleware (ADR-002). Settings typed (ADR-005).
