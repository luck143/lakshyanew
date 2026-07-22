#!/usr/bin/env bash
# scripts/migrate.sh — Lakshya -> LakshyaNew data migration runbook.
#
# Old ClickHouse (PROD) is READ-ONLY. This script never writes to it.
# It copies a sample (local) or the full dataset (VPS) into the new Postgres.
#
# Two modes:
#   local   : small capped sample (~5k rows/table) for dev on this laptop.
#   full    : full production pull (run on the VPS/Docker box, prod tenant t0).
#
# Usage:
#   ./scripts/migrate.sh local     # capped sample -> tenant 'default'
#   ./scripts/migrate.sh full      # full pull     -> tenant t0
#   ./scripts/migrate.sh discover  # safe read-only pre-flight (no data copied)
#   ./scripts/migrate.sh validate  # static spec<->schema check (no DB)
#   ./scripts/migrate.sh clean     # TRUNCATE all PG tables (local dev only)
#
# Env you must supply for prod (the script reads them if set, else uses
# localhost defaults for `local`):
#   OLD_CH_URL_SAAS   read-only DSN to prod ClickHouse (lakshya DB)
#   OLD_CH_URL_BLOGDB read-only DSN to blog ClickHouse (167.235.23.158; deferred)
#   DATABASE_URL        target Postgres DSN
#   DEFAULT_TENANT    tenant id to land data under
set -euo pipefail

MODE="${1:-local}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="$ROOT/apps/api"
TSX="$API/node_modules/.bin/tsx"
cd "$API"

# Read-only prod ClickHouse DSNs (override via env). NEVER writable.
export OLD_CH_URL_SAAS="${OLD_CH_URL_SAAS:-http://default:mysterioA143@188.245.85.41:8123}"
export OLD_CH_URL_BLOGDB="${OLD_CH_URL_BLOGDB:-http://default:mysterioA143@167.235.23.158:8123}"
export OLD_CH_URL_GPAADB="${OLD_CH_URL_GPAADB:-http://default:mysterioA143@78.47.177.68:8123}"
export OLD_CH_URL="${OLD_CH_URL_SAAS}"   # default fallback host
export OLD_CH_DB_SAAS="${OLD_CH_DB_SAAS:-lakshya}"

# Blog (blogpost/blogcategory/blogcomment/successstory) lives on a SEPARATE
# server (167.235.23.158) and is DEFERRED by decision. Not migrated.
RESOURCES="user,setting,topic,category,quiz,quizset,exam,note,liveclass,videolist,quizcomment,product,order,review,coupon,subscription,invoice,ticket,notice,domain,module,subscriber,event,askquestion,raiseproblem"

run() { "$TSX" "$ROOT/scripts/migrate/run.ts" "$@"; }

case "$MODE" in
  validate)
    echo "== validate specs (static, no DB) =="
    "$TSX" "$ROOT/scripts/migrate/validate-specs.ts"
    ;;
  discover)
    echo "== DISCOVER (read-only pre-flight; no data copied) =="
    run --discover
    ;;
  clean)
    echo "== CLEAN (TRUNCATE all PG tables) =="
    export DATABASE_URL="${DATABASE_URL:-postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public}"
    "$TSX" "$ROOT/scripts/migrate/clean.ts"
    ;;
  local)
    echo "== LOCAL sample migration (capped ~5k/table -> tenant 'default') =="
    export DATABASE_URL="${DATABASE_URL:-postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public}"
    export DEFAULT_TENANT="${DEFAULT_TENANT:-default}"
    export ETL_BATCH="${ETL_BATCH:-5000}"
    # ETL_LIMIT left unset -> generic.ts defaults to 5000 (capped sample).
    run --resource "$RESOURCES"
    ;;
  full)
    echo "== FULL production pull (-> tenant t0) =="
    : "${DATABASE_URL:?DATABASE_URL must be set for full pull}"
    export DEFAULT_TENANT="${DEFAULT_TENANT:-00000000-0000-0000-0000-0000000000t0}"
    export ETL_BATCH="${ETL_BATCH:-100000}"
    # ETL_LIMIT empty -> generic.ts pulls ALL rows (no source LIMIT).
    export ETL_LIMIT="${ETL_LIMIT:-}"
    run --resource "$RESOURCES"
    ;;
  *)
    echo "usage: $0 {local|full|discover|validate|clean}" >&2
    exit 2
    ;;
esac
