// apps/api/src/builder-store.ts
// Persistence for Resource-Builder definitions. The SINGLE SOURCE OF TRUTH is
// the JSON file per resource under packages/core/resources/<name>.json (loaded
// at boot by @lakshya/core's loadResourceFiles). This module reads/writes those
// files so the builder UI edits the same definitions the API boots from — no
// DB table, no duplicate store.
//
// Physical tables are still created on demand via raw SQL (createTableSql) so a
// brand-new resource works immediately; for production the table should also be
// emitted through `pnpm gen:schema` + `prisma db push` (see scripts/gen-schema.mjs).
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync } from 'node:fs';
import { registry, type Resource, normalizeResource, createTableSql, resourceToJson } from '@lakshya/core';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const RES_DIR = resolve(here, '..', '..', '..', 'packages', 'core', 'resources');

function fileFor(name: string): string {
  return resolve(RES_DIR, `${name}.json`);
}

async function ensureDir(): Promise<void> {
  if (!existsSync(RES_DIR)) mkdirSync(RES_DIR, { recursive: true });
}

// Reload builder definitions from JSON files into the live registry.
// Builder resources always reflect the persisted file (edits / delete+recreate
// override any stale in-memory copy). Throttled like before.
let cacheUntil = 0;
let cachePromise: Promise<number> | null = null;
const TTL_MS = 3000;
const registeredFromStore = new Set<string>();

export async function loadBuilderResources(force = false): Promise<number> {
  const now = Date.now();
  if (!force && cachePromise && now < cacheUntil) return cachePromise;
  cachePromise = (async () => {
    await ensureDir();
    const liveNames = new Set<string>();
    let count = 0;
    for (const f of readdirSync(RES_DIR)) {
      if (!f.endsWith('.json')) continue;
      try {
        const def = JSON.parse(readFileSync(fileFor(f.slice(0, -5)), 'utf8'));
        registry.upsert(def);
        registeredFromStore.add(def.name);
        liveNames.add(def.name);
        count++;
      } catch (e: any) {
        console.warn(`[builder] skipping ${f}: ${e?.message}`);
      }
    }
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
  await ensureDir();
  const out: Array<{ name: string; label: string; table: string }> = [];
  for (const f of readdirSync(RES_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      const def = JSON.parse(readFileSync(fileFor(f.slice(0, -5)), 'utf8'));
      out.push({ name: def.name, label: def.label, table: def.table });
    } catch { /* skip */ }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBuilderResource(name: string): Promise<Resource | null> {
  const fp = fileFor(name);
  if (!existsSync(fp)) return null;
  try { return JSON.parse(readFileSync(fp, 'utf8')); } catch { return null; }
}

// Validate via core, create the physical table, persist the JSON file, register.
// Throws with .status on user error.
export async function createBuilderResource(raw: any): Promise<Resource> {
  const def = normalizeResource(raw);              // throws on invalid
  const sql = createTableSql(def, def.table !== 'Tenant'); // idempotent
  // Best-effort physical table creation (raw SQL). Failure here is non-fatal
  // for the definition itself (it still gets persisted + registered).
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$executeRawUnsafe(sql).catch(() => {});
    await prisma.$disconnect().catch(() => {});
  } catch { /* ignore */ }

  const json = resourceToJson(def);
  await ensureDir();
  writeFileSync(fileFor(def.name), JSON.stringify(json, null, 2) + '\n');
  registry.upsert(json);
  registeredFromStore.add(json.name);
  return json;
}

export async function deleteBuilderResource(name: string): Promise<void> {
  const fp = fileFor(name);
  if (existsSync(fp)) unlinkSync(fp);
  registry.unregister(name);
  registeredFromStore.delete(name);
}

export async function dropBuilderTable(table: string): Promise<void> {
  const safe = String(table).replace(/[^a-zA-Z0-9_]/g, '');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${safe}"`).catch(() => {});
  await prisma.$disconnect().catch(() => {});
}
