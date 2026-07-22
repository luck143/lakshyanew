# Lakshyanew — Documentation Index

Modern reimplementation of the Lakshya Panel metadata-driven LMS. See the
[migration plan](MIGRATION_PLAN.md) for the full analysis and roadmap.

## Start here
- [MIGRATION_PLAN.md](MIGRATION_PLAN.md) — analysis, architecture, 16-section plan, module matrix.
- [PROGRESS.md](PROGRESS.md) — **living implementation log**; what's built/tested each phase.

## Architecture & Decisions (ADRs)
- [architecture.md](architecture.md) — component + metadata-loop overview.
- [adr/ADR-001-api-framework.md](adr/ADR-001-api-framework.md) — Next.js monolith vs NestJS.
- [adr/ADR-002-tenancy.md](adr/ADR-002-tenancy.md) — `tenant_id` column model.
- [adr/ADR-003-response-envelope.md](adr/ADR-003-response-envelope.md) — legacy `{status,data,message}`.
- [adr/ADR-004-php-laravel-alt.md](adr/ADR-004-php-laravel-alt.md) — PHP/Laravel+Filament alternative.
- [adr/ADR-005-database-strategy.md](adr/ADR-005-database-strategy.md) — **Postgres primary, ClickHouse logs-only (ACCEPTED)**.
- [adr/ADR-006-render-strategy.md](adr/ADR-006-render-strategy.md) — SSR/ISR/CSR matrix.
- [adr/ADR-007-som-permissions.md](adr/ADR-007-som-permissions.md) — SOM (Scoped Object Model) permissions.
- [adr/ADR-008-payment-abstraction.md](adr/ADR-008-payment-abstraction.md) — swappable payment gateway (fail-closed).

## Modules
- [modules/MODULE_MATRIX.md](modules/MODULE_MATRIX.md) — 22-module migrate/redesign/remove matrix (v2).

## Services & Runtime
- [RUNTIME.md](RUNTIME.md) — service ports, lifecycle commands, troubleshooting.
- See also: `ADMIN_FEATURES.md` (admin UX guide) at repo root.

## Status
- **Phase 27 ✅ complete** (39 metadata resources, generic CRUD, ETL engine, 151 tests passing).
- Current test suite: 151/151 (api 107, core 16, webstore 3+5skip, logger 4, codegen 5, admin 5, ui-admin 7, admin-publisher 3).
- All services verified running on canonical ports.
