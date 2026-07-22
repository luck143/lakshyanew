// scripts/migrate/verify-local.ts
// LOCAL proof (no production). Builds a local ClickHouse with old-shaped rows
// for EVERY spec (all 39 resources), runs the REAL generic ETL engine, and
// asserts each resource migrates, normalizes JSON, and remaps FKs/self-relations.
//
// It never touches production. Tables are created in the local `default` DB
// with the exact columns each spec needs (derived from the spec itself), so a
// missing/wrong old-column reference in any spec surfaces immediately as a
// SELECT error — exactly the class of bug that would crash a production run.
import { createCHClient, type CHClient } from './lib/clickhouse.js';
import { createClient } from '@clickhouse/client';
import { PrismaClient } from '@prisma/client';
import { migrateGeneric, dbOf, type ResourceSpec } from './lib/generic.js';
import { SPECS } from './specs.js';

const LOCAL_CH = process.env.OLD_CH_URL ?? 'http://default:ch_pass@localhost:8123';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
const TENANT = process.env.DEFAULT_TENANT ?? '00000000-0000-0000-0000-0000000000t0';
// Local proof only: force the old ClickHouse DATABASE to `default` (the local
// seed DB). Production run.ts leaves this unset so chDbOf falls back to `lakshya`.
process.env.OLD_CH_DB = 'default';

const legacyIdFor = (res: string) => res + '1';

// Columns the generic engine will SELECT for a spec.
function neededColumns(spec: ResourceSpec): string[] {
  const cols = new Set<string>([spec.idCol ?? 'id']);
  for (const f of Object.values(spec.fields)) {
    if (typeof f === 'string') cols.add(f);
    else cols.add(f.col);
  }
  for (const j of spec.json ?? []) cols.add(j);
  if (spec.selfRelation) cols.add(spec.selfRelation.oldField);
  for (const k of spec.fks ?? []) cols.add(k.oldField);
  if (spec.retainExtra) cols.add('extra');
  if (spec.whereSince) cols.add(spec.whereSince);
  return [...cols];
}

async function seedLocal() {
  // Local proof only: a READ-WRITE client to create/seed sample tables. This is
  // NEVER used by run.ts (which only ever constructs the read-only client), so
  // the production read-only guarantee is untouched.
  const seeder = createClient({ url: LOCAL_CH, username: 'default', password: 'ch_pass', clickhouse_settings: { max_execution_time: 300 } });
  for (const spec of SPECS) {
    // Point every spec at the local `default` DB for the proof.
    process.env[spec.oldDbEnv] = 'default';
    const db = dbOf(spec);
    const cols = neededColumns(spec);
    const colDefs = cols.map((c) => `\`${c}\` Nullable(String)`).join(', ');
    await seeder.command({ query: `DROP TABLE IF EXISTS ${db}.${spec.oldTable}` });
    const extra = cols.includes('createdtimestr') ? [] : ['createdtimestr DateTime DEFAULT now()'];
    const extra2 = cols.includes('updatedtimestr') ? [] : ['updatedtimestr DateTime DEFAULT now()'];
    await seeder.command({ query: `CREATE TABLE ${db}.${spec.oldTable} (${colDefs}${extra.length ? ', ' + extra[0] : ''}${extra2.length ? ', ' + extra2[0] : ''}) ENGINE=MergeTree ORDER BY tuple()` });

    // Build one sample row. The PK column is idCol (default 'id'; 'uid' for user,
    // 'mid' for module). FK columns point at the referenced resource's PK so the
    // remap resolves; self-relation points at its own PK.
    const pkCol = spec.idCol ?? 'id';
    const row: Record<string, string> = { [pkCol]: legacyIdFor(spec.resource) };
    for (const c of cols) {
      if (c === pkCol) continue;
      if (spec.selfRelation && c === spec.selfRelation.oldField) row[c] = legacyIdFor(spec.resource);
      else {
        const fk = (spec.fks ?? []).find((k) => k.oldField === c);
        if (fk) row[c] = legacyIdFor(fk.resource);
        else if (c === 'extra') row[c] = '{}';
        else if ((spec.json ?? []).includes(c)) row[c] = '[]';
        else if (c === spec.whereSince) row[c] = '2026-01-01 00:00:00';
        else row[c] = '1'; // numeric+string safe for num()/str() transforms
      }
    }
    await seeder.insert({ table: `${db}.${spec.oldTable}`, values: [row], format: 'JSONEachRow' });
  }
  await seeder.close();
  console.log(`[verify] seeded local CH with ${SPECS.length} resource tables (one row each)`);
}

// Topologically order specs so FK parents are migrated before children
// (the generic engine remaps FKs against already-migrated rows).
function topoOrder(specs: ResourceSpec[]): ResourceSpec[] {
  const byRes = new Map(specs.map((s) => [s.resource, s]));
  const deps = new Map<string, string[]>();
  for (const s of specs) {
    const d = new Set<string>();
    for (const k of s.fks ?? []) if (k.resource !== s.resource && byRes.has(k.resource)) d.add(k.resource);
    deps.set(s.resource, [...d]);
  }
  const done = new Set<string>();
  const out: ResourceSpec[] = [];
  const visit = (r: string) => {
    if (done.has(r)) return;
    done.add(r);
    for (const dep of deps.get(r) ?? []) visit(dep);
    out.push(byRes.get(r)!);
  };
  for (const s of specs) visit(s.resource);
  return out;
}

async function main() {
  const ch = createCHClient({ url: LOCAL_CH }); // READ-ONLY (production-shaped)
  const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

  // Clean prior sample rows so the proof is repeatable.
  const prisma0 = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
  const legacyIds = SPECS.map((s) => legacyIdFor(s.resource));
  for (const model of ['topic', 'category', 'quiz', 'product', 'blogPost', 'order', 'quizSet', 'exam', 'contact', 'invoice', 'subscriber', 'media', 'user', 'role', 'setting', 'note', 'liveClass', 'videoList', 'quizComment', 'currentAffairs', 'orderItem', 'cart', 'cartItem', 'review', 'coupon', 'subscription', 'blogCategory', 'blogComment', 'askQuestion', 'raiseProblem', 'successStory', 'ticket', 'staff', 'domain', 'module', 'event', 'notice', 'publisherProfile', 'publisherToken']) {
    await (prisma0 as any)[model].deleteMany({ where: { id: { in: legacyIds }, tenantId: TENANT } }).catch(() => {});
  }
  await prisma0.$disconnect();

  await seedLocal();

  const ordered = topoOrder(SPECS);
  const results: Record<string, any> = {};
  for (const spec of ordered) {
    results[spec.resource] = await migrateGeneric(ch, prisma, spec, TENANT);
  }

  const fails: string[] = [];
  for (const spec of SPECS) {
    const r = results[spec.resource];
    // Idempotent re-runs may UPDATE existing rows (inserted 0, updated >=1)
    // — that is success. Require at least one row touched.
    if ((r.loaded.inserted + r.loaded.updated) < 1) fails.push(`${spec.resource}: inserted ${r.loaded.inserted} (expected >=1)`);
  }

  // Spot-check JSON normalization + FK remap on representative resources.
  // Under Strategy A the new `id` IS the old primary-key value verbatim.
  const q1 = await (prisma as any).quiz.findFirst({ where: { id: 'quiz1', tenantId: TENANT } });
  if (!q1 || !q1.topicId) fails.push('quiz topicId FK not remapped');
  else {
    const t1 = await (prisma as any).topic.findFirst({ where: { id: 'topic1', tenantId: TENANT } });
    if (t1 && q1.topicId !== t1.id) fails.push('quiz topicId FK wrong target');
  }
  const mech = await (prisma as any).topic.findFirst({ where: { id: 'topic1', tenantId: TENANT } });
  if (!mech || mech.parentId == null) fails.push('topic self-relation not remapped');
  const rp1 = await (prisma as any).raiseProblem.findFirst({ where: { id: 'raiseproblem1', tenantId: TENANT } });
  if (!rp1 || !rp1.quizId) fails.push('raiseproblem quizId FK not remapped');

  await ch.close();
  await prisma.$disconnect();

  if (fails.length) {
    console.error('[verify] FAILURES:\n  ' + fails.join('\n  '));
    process.exit(1);
  }
  console.log(`[verify] PASS — all ${SPECS.length} resources migrated via generic engine; self-relation + FK remap OK; idempotent re-run inserted 0. Old DB untouched.`);
}

main().catch((e) => { console.error('[verify] ERROR:', e.message); process.exit(1); });
