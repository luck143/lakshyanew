# ADR-005: Database Strategy — ClickHouse Retention

**Status:** Accepted · **Date:** 2026-07-19
**Decision confirmed by user:** PostgreSQL is the primary system of record; ClickHouse is used
**only** for log/event storage (activity logs, API logs, quiz attempts, answer logs, rankings).
No CRUD/business data lives in ClickHouse.

## Context
Old system uses ClickHouse as the **primary OLTP** for most resources, with append-only updates
(`process_edit` inserts a new version; reads use `FINAL`). This fights the relational model and is
costly/awkward (constant `FINAL`, tombstones for delete, JSON blobs for relations via `tag_builder`).

## Decision
- **Postgres = system of record** for all CRUD resources (users, topics, quiz_set, ecom, blog, notes).
  Normalized with real FK relations.
- **ClickHouse = analytics only**: quiz attempts, answer logs, rankings, activity/apilog, message log.
  High-volume, append-only-by-nature event data.
- Preserve an opt-in `versioned: true` resource flag for the rare case a resource wants history.

## Rationale
- Append-only-as-OLTP is the single biggest source of complexity/bugs in the old code. Postgres
  gives real updates, FKs, transactions, and simpler admin UI.
- ClickHouse earns its keep only at event scale; keep it there.

## Consequences
- ✅ Simpler CRUD, correct relations, standard tooling (Prisma migrations).
- ⚠️ Requires ETL of existing ClickHouse CRUD rows → Postgres (Phase 2). Analytics tables stay.
- 🔁 If a future resource is genuinely event-scaled, put it in ClickHouse by design, not by default.
