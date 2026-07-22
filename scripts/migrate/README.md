# Data Migration — Runbook

Lakshya (legacy ClickHouse, **PROD, read-only**) → LakshyaNew (Postgres, **write target**).

The migration is **metadata-driven + Strategy A**: the new `id` for every row
is the old ClickHouse primary-key value **verbatim** (`uid`/`mid`/`name`/`id`),
so all legacy URLs/SEO are preserved. No `legacyId` column. Old column
names never enter new code; everything maps through `specs.ts`.

## Safety (non-negotiable)
- The old ClickHouse client is **read-only** (`readonly=1` + SELECT-only guard).
  This script NEVER writes to, deletes from, or alters prod.
- Idempotent: re-running updates existing rows (key `tenantId`+`id`). Safe to re-run.
- Validates: prints extracted vs loaded vs PG count; flags inconsistencies.

## Runbook

`./scripts/migrate.sh` wraps the TS scripts. Modes:

| Command | What it does | Writes to PG? |
|---|---|---|
| `./scripts/migrate.sh validate` | Static check: every spec field exists on its Prisma model | no |
| `./scripts/migrate.sh discover` | **Read-only** pre-flight: reports which source tables exist | no |
| `./scripts/migrate.sh local` | Capped sample (~5k rows/table) → tenant `default` | yes (dev only) |
| `./scripts/migrate.sh full` | **Full production pull** → tenant `t0` | yes (VPS/Docker) |
| `./scripts/migrate.sh clean` | TRUNCATE all PG tables (local dev reset) | yes (dev only) |

### Local dev (this laptop)
```bash
./scripts/migrate.sh local     # capped ~5k/table, tenant 'default' — fast, small DB
```
This is what's currently loaded. The local Postgres stays small/fast.

### Production pull (later, on the VPS/Docker box)
```bash
DATABASE_URL='postgresql://USER:PASS@vps-host:5432/lakshya?schema=public' \
OLD_CH_URL_SAAS='http://READONLY_USER:PASS@188.245.85.41:8123' \
./scripts/migrate.sh full
```
`full` leaves `ETL_LIMIT` empty → `generic.ts` pulls **all ~1.3M rows**
(no source `LIMIT`). Run it once on a box with enough RAM/disk.

## Env vars
| Var | Meaning | Default (local) |
|---|---|---|
| `OLD_CH_URL_SAAS` | read-only DSN → prod ClickHouse (`lakshya` DB) | `http://default:***@188.245.85.41:8123` |
| `OLD_CH_URL_BLOGDB` | read-only DSN → blog ClickHouse (167.235.23.158) — **deferred** | `http://default:***@167.235.23.158:8123` |
| `DATABASE_URL` | target Postgres DSN | `postgresql://lakshya:***@localhost:5432/lakshya` |
| `DEFAULT_TENANT` | tenant id to land data under | `default` (local) / `t0` (prod) |
| `ETL_BATCH` | upsert chunk size | `5000` (local) / `100000` (full) |
| `ETL_LIMIT` | cap rows/table; **empty = no cap (full pull)** | `5000` (local default) |

## Out of scope (deferred)
- **Blog** (`blogpost`/`blogcategory`/`blogcomment`/`successstory`) lives on a
  **separate ClickHouse server** (167.235.23.158). Excluded by decision.
- `in_media` / `in_publisher_profile` are not in the 25-resource migrated set.

## Files
- `specs.ts` — 39 ResourceSpecs (old→new field map, FKs, self-relations).
- `lib/generic.ts` — single-SELECT + chunked upsert; `ETL_LIMIT` caps the source.
- `lib/pg.ts` — bulk `createMany` + per-row fallback (surfaces bad rows, skips dup PKs).
- `lib/clickhouse.ts` — read-only multi-host CH client.
- `run.ts` — orchestrator (`--discover` / `--resource a,b`).
- `validate-specs.ts` — static spec↔schema check.
- `clean.ts` — truncate all tables (dev reset).
- `reconcile.ts` — prod COUNT vs PG COUNT per table (run post-migration).
