// scripts/migrate/clean.ts
// Wipe ALL data from the local target PG so the full migration starts clean.
// Scoped to the public schema; never touches the production ClickHouse.
import { PrismaClient } from '@prisma/client';

async function main() {
  const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  const tables = await p.$queryRawUnsafe<{ t: string }[]>(
    `SELECT tablename AS t FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE '_prisma_%'`
  );
  const names = tables.map((x) => `"${x.t}"`).join(', ');
  if (!names) { console.log('no tables'); await p.$disconnect(); return; }
  await p.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE;`);
  console.log(`TRUNCATED ${tables.length} tables.`);
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
