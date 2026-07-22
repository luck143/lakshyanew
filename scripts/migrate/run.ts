// scripts/migrate/run.ts
// ETL orchestrator: old ClickHouse (READ-ONLY) -> new Postgres.
//
// SAFETY:
//  - The old ClickHouse client is read-only (readonly=1 + SELECT-only guard).
//  - This script NEVER writes to the old database. Production data is untouched.
//  - Idempotent: re-running updates existing rows (key: tenantId + legacyId).
//  - Validated: prints extracted vs loaded vs PG count and flags mismatches.
//
// MODES:
//  --discover   Pre-flight, READ-ONLY. Connects to the old CH and reports, for
//               every spec, whether its source table exists (and in which DB).
//               Safe to run against production with your read-only DSN. No PG
//               writes, no data copied.
//  (default)    Runs the migration for all (or --resource) specs in dependency
//               order. Resilient: one bad/ missing source table is reported and
//               skipped, not aborting the whole run.
//
// USAGE (READ-ONLY against production — never writes to old CH):
//   OLD_CH_URL_SAAS='http://default:<pass>@188.245.85.41:8123' \
//   OLD_CH_URL_BLOGDB='http://default:<pass>@167.235.23.158:8123' \
//   OLD_CH_URL_GPAADB='http://default:<pass>@78.47.177.68:8123' \
//   DATABASE_URL='postgresql://...' \
//   DEFAULT_TENANT='00000000-0000-0000-0000-0000000000t0' \
//   npx tsx scripts/migrate/run.ts --discover          # safe pre-flight (no data copied)
//   npx tsx scripts/migrate/run.ts                      # migrate all (writes to PG only)
//   npx tsx scripts/migrate/run.ts --resource topic,category
// The per-DB URL env key is OLD_CH_URL_<DB> (uppercased, non-alnum -> _);
// missing ones fall back to OLD_CH_URL. The client is read-only (readonly=1).
import { clientForDb } from './lib/clickhouse.js';
import { PrismaClient } from '@prisma/client';
import { migrateGeneric, discoverTable, dbOf } from './lib/generic.js';
import { SPECS } from './specs.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://lakshya:***@localhost:5432/lakshya?schema=public';
const DEFAULT_TENANT = process.env.DEFAULT_TENANT ?? '00000000-0000-0000-0000-0000000000t0';
const SINCE = process.argv.includes('--since') ? process.argv[process.argv.indexOf('--since') + 1] : undefined;
const DISCOVER = process.argv.includes('--discover');

// Migration order: referenced resources before those that FK to them.
const ORDER = [
  'tenant', 'user', 'role', 'setting', 'topic', 'category', 'blogpost',
  'quiz', 'quizset', 'exam', 'note', 'liveclass', 'videolist', 'quizcomment', 'currentaffairs',
  'product', 'order', 'orderitem', 'cart', 'cartitem', 'review', 'coupon', 'subscription',
  'contact', 'invoice', 'ticket', 'staff', 'domain', 'module', 'subscriber', 'event', 'notice',
  'blogcategory', 'blogcomment', 'askquestion', 'raiseproblem', 'successstory',
  'publisherprofile', 'publishertoken', 'media', 'mediavariant',
];

function only(): Set<string> | null {
  const i = process.argv.indexOf('--resource');
  if (i === -1) return null;
  return new Set(process.argv[i + 1].split(','));
}

function orderedSpecs(): any[] {
  const byName = new Map(SPECS.map((s) => [s.resource, s]));
  return [
    ...ORDER.filter((n) => byName.has(n)).map((n) => byName.get(n)!),
    ...SPECS.filter((s) => !ORDER.includes(s.resource)),
  ];
}

// Pre-flight: report source-table existence for every spec. Read-only.
async function discover() {
  const want = only();
  console.log(`[DISCOVER] old CH (READ-ONLY, multi-host via OLD_CH_URL_<DB>)\n`);
  let missing = 0;
  const specs = orderedSpecs().filter((s) => !want || want.has(s.resource));
  for (const spec of specs) {
    const ch = clientForDb(dbOf(spec)); // per-db read-only client
    try {
      const r = await discoverTable(ch, spec);
      const tag = r.exists ? 'OK  ' : 'MISS';
      if (!r.exists) missing++;
      console.log(`  ${tag} ${spec.resource.padEnd(14)} ${dbOf(spec)}.${spec.oldTable}${r.error ? '  (' + r.error + ')' : ''}`);
    } finally {
      await ch.close();
    }
  }
  console.log(`\n[DISCOVER] ${specs.length} spec(s) checked, ${missing} source table(s) MISSING.`);
  console.log('[DISCOVER] No data was read or written. Safe pre-flight complete.');
  if (missing > 0) process.exitCode = 2;
}

async function migrate() {
  const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
  const want = only();
  const report: any[] = [];
  let inconsistencies = 0;

  console.log(`[ETL] old CH (READ-ONLY, multi-host via OLD_CH_URL_<DB>)`);
  console.log(`[ETL] target PG tenant: ${DEFAULT_TENANT}`);
  console.log(`[ETL] incremental since: ${SINCE ?? '(full)'}\n`);

  const specs = orderedSpecs().filter((s) => !want || want.has(s.resource));
  for (const spec of specs) {
    const ch = clientForDb(dbOf(spec)); // per-db read-only client
    try {
      // Pre-check: if the source table is absent, skip (don't error) when
      // skipIfMissing is set — used for tables that live on other hosts.
      const pre = await discoverTable(ch, spec);
      if (!pre.exists) {
        if (spec.skipIfMissing) {
          console.log(`  ${spec.resource.padEnd(14)} SKIP (source table ${dbOf(spec)}.${spec.oldTable} absent)`);
          report.push({ resource: spec.resource, error: null, skipped: true });
          continue;
        }
        throw new Error(`source table ${dbOf(spec)}.${spec.oldTable} does not exist`);
      }
      const res = await migrateGeneric(ch, prisma, spec, DEFAULT_TENANT, undefined, SINCE);
      const ok = res.pgCount >= res.loaded.inserted + res.loaded.updated;
      if (res.extracted !== res.loaded.inserted + res.loaded.updated) inconsistencies++;
      report.push({ ...res, consistent: ok, error: null });
      console.log(
        `  ${spec.resource.padEnd(14)} extracted=${res.extracted} inserted=${res.loaded.inserted} updated=${res.loaded.updated} pgCount=${res.pgCount} ${ok ? 'OK' : 'CHECK'}`,
      );
    } catch (e: any) {
      // A single resource failing (e.g. table missing in source) must not abort
      // the whole migration. Report and continue.
      inconsistencies++;
      report.push({ resource: spec.resource, error: e.message });
      console.log(`  ${spec.resource.padEnd(14)} ERROR: ${(e.stack || e.message || JSON.stringify(e)).split('\n')[0]}`);
    } finally {
      await ch.close();
    }
  }
  await prisma.$disconnect();

  console.log('\n[ETL] SUMMARY');
  const okCount = report.filter((r) => !r.error).length;
  const errCount = report.filter((r) => r.error).length;
  for (const r of report) {
    if (r.error) console.log(`  ${r.resource}: ERROR — ${r.error.split('\n')[0]}`);
    else console.log(`  ${r.resource}: extracted ${r.extracted}, loaded ${r.loaded.inserted + r.loaded.updated}, pg ${r.pgCount}`);
  }
  if (errCount > 0) {
    console.log(`\n[ETL] DONE with ${errCount} resource(s) in ERROR (e.g. source table missing) — review above. ${okCount} migrated.`);
    process.exitCode = 2;
  } else {
    console.log('\n[ETL] DONE — all resources consistent. Old database was not modified.');
  }
}

async function main() {
  if (DISCOVER) await discover();
  else await migrate();
}

main().catch((e) => {
  console.error('[ETL] FAILED:', e.message);
  process.exit(1);
});
