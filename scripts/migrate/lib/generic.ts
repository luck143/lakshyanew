// scripts/migrate/lib/generic.ts
// Generic, config-driven ETL for old ClickHouse -> new Postgres.
//
// Each resource is declared as a `ResourceSpec` (field map + JSON cols + FK /
// self-relation remaps). `migrateGeneric` runs the same safe, idempotent,
// read-only pipeline for every resource, so adding a migration is declarative
// instead of copy-pasted boilerplate.
//
// SAFETY: old DB is read-only (see lib/clickhouse.ts). Upserts are keyed by
// (tenantId, legacyId) so re-runs are idempotent.
import type { CHClient } from './clickhouse.js';
import { clientForDb, chDbOf } from './clickhouse.js';
import { upsertBatch, countRows, type LoadResult, type UpsertRow } from './pg.js';
import type { PrismaClient } from '@prisma/client';
import { SPECS } from '../specs.js';

// resource key -> Prisma model name (for resolving FK targets' delegates).
const MODEL_BY_RESOURCE = new Map(SPECS.map((s) => [s.resource, s.model]));

// A field mapping entry: either a string (old column name copied verbatim) or
// a transform { col, fn } where fn(oldRow, ctx) -> value.
export type FieldMap =
  | string
  | { col: string; fn: (row: any, ctx: { tenantId: string }) => unknown };

export interface FkSpec {
  oldField: string;          // old column holding the legacy parent id
  resource: string;          // new resource name whose legacyId we resolve
  newField: string;          // new column to set
}

export interface ResourceSpec {
  resource: string;          // new resource key (for logging)
  model: string;             // Prisma model delegate name (e.g. 'BlogPost')
  oldTable: string;          // old ClickHouse table name (with .env prefix, e.g. ecom_products)
  oldDbEnv: string;          // env var for the old ClickHouse connection (conn) override
  oldDb?: string;            // default old DB/conn name if the env is unset (e.g. 'lakshya')
  idCol?: string;            // old primary-key column (default 'id'); e.g. 'uid' for in_users, 'mid' for in_modules
  fields: Record<string, FieldMap>; // newField -> old source
  json?: string[];           // old columns that hold JSON strings -> jsonb
  retainExtra?: boolean;     // if old table has `extra`, keep residual as jsonb
  selfRelation?: { newField: string; oldField: string };
  fks?: FkSpec[];
  whereSince?: string;       // column used for --since incremental (old col)
  skipIfMissing?: boolean;   // if the source table is absent, skip (don't error)
}

export interface GenericResult {
  resource: string;
  extracted: number;
  loaded: LoadResult;
  pgCount: number;
}

// Build an oldPK -> newId map for a referenced resource (for FK / self-remap).
// Under Strategy A the new `id` equals the old primary-key value verbatim, so
// this map is effectively identity — but we keep it generic so any FK whose
// old column differs from the parent's PK still resolves correctly.
async function legacyMap(prisma: PrismaClient, model: string, tenantId: string): Promise<Map<string, string>> {
  const delegateName = model.charAt(0).toLowerCase() + model.slice(1);
  const delegate = (prisma as any)[delegateName];
  if (!delegate) throw new Error(`legacyMap: no Prisma delegate for model '${model}' (tried '${delegateName}')`);
  const rows = await delegate.findMany({ where: { tenantId }, select: { id: true } });
  const m = new Map<string, string>();
  for (const r of rows) m.set(r.id, r.id);
  return m;
}

// Resolve the old ClickHouse database for a spec: explicit env override, else
// the spec's declared default (conn), else 'saas'.
export function dbOf(spec: ResourceSpec): string {
  return process.env[spec.oldDbEnv] ?? spec.oldDb ?? 'saas';
}

// Pre-flight: does the source table exist in the old (read-only) ClickHouse?
export async function discoverTable(ch: CHClient, spec: ResourceSpec): Promise<{ exists: boolean; db: string; error?: string }> {
  const db = chDbOf(dbOf(spec));
  try {
    // A cheap, read-only existence probe. `system.tables` is readable under
    // readonly=1; this never touches or modifies production data.
    const rows = await ch.select<{ name: string }>(
      `SELECT name FROM system.tables WHERE database = '${db}' AND name = '${spec.oldTable}'`,
    );
    return { exists: rows.length > 0, db };
  } catch (e: any) {
    return { exists: false, db, error: e.message?.split('\n')[0] };
  }
}

export async function migrateGeneric(
  ch: CHClient,
  prisma: PrismaClient,
  spec: ResourceSpec,
  tenantId: string,
  _database?: string,
  since?: string,
): Promise<GenericResult> {
  const database = chDbOf(dbOf(spec)); // the real ClickHouse database (usually 'default')
  const sinceCol = spec.whereSince ?? 'updatedtimestr';
  const pkCol = spec.idCol ?? 'id';
  const cols = [pkCol,
    ...Object.values(spec.fields).map((f) => (typeof f === 'string' ? f : f.col)),
    ...(spec.json ?? []), ...(spec.selfRelation ? [spec.selfRelation.oldField] : []),
    ...(spec.fks ?? []).map((k) => k.oldField),
    ...(spec.retainExtra ? ['extra'] : []), ...(spec.whereSince ? [spec.whereSince] : []),
  ].filter((c, i, a) => a.indexOf(c) === i);
  const sel = cols.join(', ');
  // Single SELECT per table (no string-PK cursor — variable-length
  // ids like `quiz1`..`quiz667871` sort lexicographically, so
  // `id > 'cursor'` MISSES whole swaths and never finishes).
  // The result array is chunked into ETL_BATCH upserts so memory
  // stays bounded even on the ~667k-row quiz table. ETL_LIMIT
  // (if set) caps total rows for smoke runs.
  const batch = Math.max(1, Number(process.env.ETL_BATCH ?? 100000));
  // Default to a SMALL, representative sample (a few thousand rows per
  // table) so a plain run stays fast + keeps the local DB small.
  // For the FULL production pull (on the VPS/docker box), set
  // ETL_LIMIT= (empty) or a large number — e.g. ETL_LIMIT= env unset
  // or ETL_LIMIT=2000000. The src ipt is the same script either way.
  const cap = process.env.ETL_LIMIT !== undefined ? (process.env.ETL_LIMIT ? Number(process.env.ETL_LIMIT) : null) : 5000;
  const sinceSql = since ? `${sinceCol} >= parseDateTimeBestEffort('${since}')` : '';
  // When a cap is set (default 5000 on this laptop), LIMIT the SOURCE
  // query so ClickHouse only returns `cap` rows — light on CH transfer
  // + memory. For the full VPS pull, cap=null → no LIMIT → all rows.
  const limitSql = cap !== null ? ` LIMIT ${cap}` : '';
  const w = [sinceSql, limitSql].filter(Boolean).join(' ');
  const rows: any[] = await ch.select(`SELECT ${sel} FROM ${database}.${spec.oldTable} ${w}`);
  const extracted = rows.length;
  // Pre-resolve FK maps once (parent rows already migrated in prior resources).
  const fkMaps: Record<string, Map<string, string>> = {};
  for (const fk of spec.fks ?? []) {
    const fkModel = MODEL_BY_RESOURCE.get(fk.resource) ?? fk.resource;
    fkMaps[fk.resource] = await legacyMap(prisma, fkModel, tenantId);
  }
  const selfMap = spec.selfRelation ? await legacyMap(prisma, spec.model, tenantId) : null;
  let loaded: LoadResult = { inserted: 0, updated: 0, skipped: 0 };
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const payload: UpsertRow[] = chunk.map((r: any) => rowToPayload(r, spec, tenantId, fkMaps, selfMap));
    const lr = await upsertBatch(prisma, spec.model, payload);
    loaded.inserted += lr.inserted; loaded.updated += lr.updated; loaded.skipped += lr.skipped;
    if (cap !== null && i + chunk.length >= cap) break;
  }

  // 2nd pass: resolve self-relation now that all rows exist.
  if (spec.selfRelation) {
    const delegate = (prisma as any)[spec.model.charAt(0).toLowerCase() + spec.model.slice(1)] ?? (prisma as any)[spec.model];
    const all = await delegate.findMany({ where: { tenantId }, select: { id: true } });
    const m = new Map<string, string>();
    for (const x of all) m.set(x.id, x.id);
    const pkCol2 = spec.idCol ?? 'id';
    for (const r of rows) {
      const legacy = r[spec.selfRelation.oldField];
      if (legacy && m.has(legacy) && m.has(r[pkCol2])) {
        await delegate.update({ where: { id: m.get(r[pkCol2])! }, data: { [spec.selfRelation.newField]: m.get(legacy)! } });
      }
    }
  }

  const pgCount = await countRows(prisma, spec.model, tenantId);
  return { resource: spec.resource, extracted, loaded, pgCount };
}

// Map one old ClickHouse row -> a PG upsert payload (Strategy A: id = old PK verbatim).
function rowToPayload(
  r: any,
  spec: ResourceSpec,
  tenantId: string,
  fkMaps: Record<string, Map<string, string>>,
  selfMap: Map<string, string> | null,
): UpsertRow {
  const out: Record<string, unknown> = {};
  for (const [newField, map] of Object.entries(spec.fields)) {
    if (typeof map === 'string') out[newField] = r[map];
    else out[newField] = map.fn(r, { tenantId });
  }
  for (const jc of spec.json ?? []) {
    if (r[jc] != null) {
      try { out[jc] = typeof r[jc] === 'string' ? JSON.parse(r[jc]) : r[jc]; }
      catch { out[jc] = r[jc]; }
    }
  }
  if (spec.retainExtra && r.extra != null) {
    try { out.extra = typeof r.extra === 'string' ? JSON.parse(r.extra) : r.extra; } catch { out.extra = r.extra; }
  }
  // FK remaps
  for (const fk of spec.fks ?? []) {
    const legacy = r[fk.oldField];
    out[fk.newField] = legacy && fkMaps[fk.resource]?.has(legacy) ? fkMaps[fk.resource].get(legacy)! : null;
  }
  // self-relation remap (resolved in 2nd pass after all rows exist)
  if (spec.selfRelation) {
    const legacy = r[spec.selfRelation.oldField];
    out[spec.selfRelation.newField] = legacy && selfMap?.has(legacy) ? selfMap.get(legacy)! : null;
  }
  out.tenantId = tenantId;
  // STRATEGY A: the new `id` IS the old primary-key value, copied verbatim.
  // This preserves frontend URLs (/product/<oldid>) and the FK graph exactly.
  out.id = r[spec.idCol ?? 'id'];
  return out as UpsertRow;
}
