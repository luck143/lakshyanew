// apps/api/src/builder-store.ts
// Persistence for Resource-Builder definitions. Definitions live in a
// `lakshya_resource` table (one JSON column). At API boot we load them
// into the @lakshya/core registry so the generic CRUD + admin UI pick
// them up automatically — no Prisma regeneration, no restart of the
// client required.
//
// Uses raw SQL (table is NOT in schema.prisma) so builder resources
// are fully decoupled from the compile-time Prisma models.
import { PrismaClient } from '@prisma/client';
import { registry, defineResource, type Resource, normalizeResource, createTableSql, resourceToJson } from '@lakshya/core';

const prisma = new PrismaClient();

const TABLE = 'lakshya_resource';

async function ensureTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${TABLE}" (
    "name" TEXT PRIMARY KEY,
    "label" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
}

// Cache so the (possibly separate) API process picks up newly
// created/edited builder resources without a restart. Reloads are
// throttled to once per TTL; registration into the live registry is
// idempotent (compile-time resources always win).
let cacheUntil = 0;
let cachePromise: Promise<number> | null = null;
const TTL_MS = 3000;
// Names currently registered into the live registry from the builder store.
// Used to unregister resources that have been deleted from the store.
const registeredFromStore = new Set<string>();

export async function loadBuilderResources(force = false): Promise<number> {
  const now = Date.now();
  if (!force && cachePromise && now < cacheUntil) return cachePromise;
  cachePromise = (async () => {
    await ensureTable();
    const rows: any[] = await prisma.$queryRawUnsafe(`SELECT "name", "definition" FROM "${TABLE}"`);
    const liveNames = new Set<string>();
    let count = 0;
    for (const r of rows) {
      try {
        const def = typeof r.definition === 'string' ? JSON.parse(r.definition) : r.definition;
        // Builder resources must always reflect the persisted definition
        // (edits / delete+recreate must override any stale in-memory copy).
        registry.upsert(def);
        registeredFromStore.add(def.name);
        liveNames.add(def.name);
        count++;
      } catch (e: any) {
        console.warn(`[builder] skipping ${r.name}: ${e?.message}`);
      }
    }
    // Unregister builder resources that were deleted from the store.
    for (const name of [...registeredFromStore]) {
      if (!liveNames.has(name)) {
        registry.unregister(name);
        registeredFromStore.delete(name);
      }
    }
    return count;
  })();
  cacheUntil = now + TTL_MS;
  return cachePromise;
}

export async function listBuilderResources(): Promise<Array<{ name: string; label: string; table: string }>> {
  await ensureTable();
  const rows: any[] = await prisma.$queryRawUnsafe(`SELECT "name", "label", "table" FROM "${TABLE}" ORDER BY "name"`);
  return rows.map((r) => ({ name: r.name, label: r.label, table: r.table }));
}

export async function getBuilderResource(name: string): Promise<Resource | null> {
  const rows: any[] = await prisma.$queryRawUnsafe(`SELECT "definition" FROM "${TABLE}" WHERE "name" = $1`, name);
  if (!rows[0]) return null;
  return typeof rows[0].definition === 'string' ? JSON.parse(rows[0].definition) : rows[0].definition;
}

// Validate via core, create the physical table, persist, and register.
// Throws with .status on user error.
export async function createBuilderResource(raw: any): Promise<Resource> {
  const def = normalizeResource(raw);              // throws on invalid
  const sql = createTableSql(def, def.table !== 'Tenant'); // idempotent
  await prisma.$executeRawUnsafe(sql);            // physical table
  const json = resourceToJson(def);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "${TABLE}" ("name","label","table","definition","createdAt","updatedAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
     ON CONFLICT ("name") DO UPDATE SET "label"=$2,"table"=$3,"definition"=$4,"updatedAt"=CURRENT_TIMESTAMP`,
    def.name, def.label, def.table, json,
  );
  // register into the live registry (or refresh if already present)
  registry.upsert(json);
  registeredFromStore.add(json.name);
  return json;
}

export async function deleteBuilderResource(name: string): Promise<void> {
  // NOTE: we keep the physical table (data may be valuable). The definition
  // is removed from the registry + store so the resource is no longer exposed.
  // To also drop data, call dropBuilderTable separately (explicit admin action).
  await prisma.$executeRawUnsafe(`DELETE FROM "${TABLE}" WHERE "name" = $1`, name);
  registry.unregister(name);
  registeredFromStore.delete(name);
}

export async function dropBuilderTable(table: string): Promise<void> {
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${String(table).replace(/"/g, '')}"`);
}
