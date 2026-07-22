import { PrismaClient } from '@prisma/client';
async function main() {
  const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  const r = await p.$queryRawUnsafe('SELECT conname FROM pg_constraint WHERE conrelid=\'"User"\'::regclass AND contype=\'u\'');
  console.log('UNIQUE on User:', JSON.stringify(r));
  await p.$disconnect();
}
main();
