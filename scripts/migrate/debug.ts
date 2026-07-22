import { clientForDb } from './lib/clickhouse.js';
import { PrismaClient } from '@prisma/client';
import { SPECS } from './specs.js';
import { migrateGeneric } from './lib/generic.js';

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  const res = process.argv[2] || 'user';
  const spec = SPECS.find((s) => s.resource === res);
  const ch = clientForDb('lakshya');
  try {
    const r = await migrateGeneric(ch, prisma, spec, process.env.DEFAULT_TENANT || '00000000-0000-0000-0000-0000000000t0', undefined, undefined);
    console.log('OK', res, r.loaded, 'pg', r.pgCount);
  } catch (e: any) {
    console.log('ERR-FULL', res, '::', String(e).slice(0, 800));
  }
  await ch.close();
  await prisma.$disconnect();
}
main();
