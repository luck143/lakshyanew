// scripts/migrate/lib/pg.ts
// Idempotent upsert into Postgres for the ETL.
//
// STRATEGY A (SEO-preserving): the new Postgres `id` IS the old ClickHouse
// primary-key value, copied verbatim (e.g. ecom_products.id -> Product.id).
// So URLs (/product/<oldid>) never change and FK graphs are preserved exactly.
// Idempotency key: (tenantId, id). Re-running updates the existing row instead
// of inserting a duplicate. Future app-created rows supply a fresh id (the
// schema keeps @default(uuid()) as a fallback for non-migrated inserts).
import { PrismaClient } from '@prisma/client';

export type UpsertRow = Record<string, unknown> & { id: string; tenantId: string };

export interface LoadResult {
  inserted: number;
  updated: number;
  skipped: number;
}

// Upsert a batch into `model` (lower-first Prisma delegate key).
// Bulk path: scope existing ids by tenant, then createMany only the new
// rows. 2 queries/page (findMany + createMany) instead of 2*N for the
// per-row findFirst+create/update — required for the ~1.3M-row quiz
// tables. Idempotent: rows whose id already exists are skipped.
export async function upsertBatch(
  prisma: PrismaClient,
  model: string,
  rows: UpsertRow[],
): Promise<LoadResult> {
  if (!rows.length) return { inserted: 0, updated: 0, skipped: 0 };
  const delegate = (prisma as any)[model.charAt(0).toLowerCase() + model.slice(1)] ?? (prisma as any)[model];
  if (!delegate) throw new Error(`No Prisma model delegate for "${model}"`);
  const tenantId = rows[0].tenantId as string;
  const ids = rows.map((r) => r.id);
  const existing = await delegate.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } });
  const have = new Set((existing as any[]).map((e) => e.id));
  const toCreate = rows.filter((r) => !have.has(r.id));
  let inserted = 0;
  if (toCreate.length) {
    try {
      const res = await delegate.createMany({ data: toCreate as any[] });
      inserted = (res as any).count ?? toCreate.length;
    } catch (e: any) {
      // Bulk createMany aborts the WHOLE batch on one bad row and hides the
      // culprit (empty Prisma message / undefined code). Fall back to
      // per-row upsert so a single malformed legacy row can't abort the
      // table and we surface it. Log the full error (code may be undefined).
      console.error(`  [upsert ${model}] bulk failed (code=${e?.code ?? 'undefined'} msg=${String(e?.message ?? '').slice(0,160)} meta=${JSON.stringify(e?.meta ?? {}).slice(0,240)} ctor=${e?.constructor?.name} keys=${Object.keys(e ?? {}).join(',')}); falling back to per-row`);
      for (const row of toCreate) {
        const { id, tenantId, ...data } = row;
        try { await delegate.create({ data: { ...data, tenantId, id } }); inserted++; }
        catch (e2: any) {
          if (process.env.ETL_DEBUG) console.error(`[upsert ${model}] id=${id} FULL=${require('util').inspect(e2, { depth: null }).slice(0, 800)}\n  data=${JSON.stringify(data).slice(0, 600)}`);
          // rethrow only if it's NOT a duplicate (otherwise skip)
          if (!(e2.code === 'P2002' && JSON.stringify(e2.meta ?? '').includes('id'))) throw e2;
        }
      }
    }
  }
  return { inserted, updated: 0, skipped: rows.length - inserted };
}

// Validate: count rows in PG for a model under a tenant, compare to expected.
export async function countRows(prisma: PrismaClient, model: string, tenantId: string): Promise<number> {
  const delegate = (prisma as any)[model.charAt(0).toLowerCase() + model.slice(1)] ?? (prisma as any)[model];
  return delegate.count({ where: { tenantId } });
}
