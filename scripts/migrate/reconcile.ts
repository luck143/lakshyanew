// scripts/migrate/reconcile.ts
// Post-migration reconciliation: for every migrated resource, compare the
// row COUNT in the OLD ClickHouse (read-only) against the NEW Postgres
// (local) for DEFAULT_TENANT. Reports mismatches. Does NOT modify anything.
import { createClient } from '@clickhouse/client';
import { PrismaClient } from '@prisma/client';

const CONN = 'saas';
const URL = process.env.OLD_CH_URL_SAAS ?? process.env.OLD_CH_URL;
const CH_DB = process.env.OLD_CH_DB_SAAS ?? 'lakshya';
const TENANT = process.env.DEFAULT_TENANT ?? '00000000-0000-0000-0000-0000000000t0';

// resource -> { model (PG delegate), oldTable, idCol (PK in CH), skipIfMissing }
const MAP: Record<string, { model: string; oldTable: string; idCol?: string; skip?: boolean }> = {
  user:        { model: 'User',        oldTable: 'in_users',       idCol: 'uid' },
  setting:     { model: 'Setting',     oldTable: 'in_settings' },
  domain:      { model: 'Domain',      oldTable: 'in_domains',    idCol: 'name' },
  module:      { model: 'Module',      oldTable: 'in_modules',    idCol: 'mid' },
  subscriber:  { model: 'Subscriber',  oldTable: 'in_subscribers' },
  invoice:     { model: 'Invoice',     oldTable: 'in_invoices' },
  ticket:      { model: 'Ticket',      oldTable: 'in_tickets' },
  notice:      { model: 'Notice',      oldTable: 'in_messages' },
  topic:       { model: 'Topic',       oldTable: 'lk_topics' },
  quiz:        { model: 'Quiz',        oldTable: 'lk_quiz' },
  quizset:     { model: 'QuizSet',     oldTable: 'lk_quiz_set' },
  exam:        { model: 'Exam',        oldTable: 'lk_exams' },
  note:        { model: 'Note',        oldTable: 'lk_notes' },
  liveclass:   { model: 'LiveClass',   oldTable: 'lk_liveclass' },
  videolist:   { model: 'VideoList',   oldTable: 'lk_videolist' },
  quizcomment: { model: 'QuizComment', oldTable: 'lk_comments' },
  askquestion: { model: 'AskQuestion', oldTable: 'lk_ask_question' },
  raiseproblem:{ model: 'RaiseProblem',oldTable: 'lk_raise_problems' },
  event:       { model: 'Event',       oldTable: 'lk_events' },
  product:     { model: 'Product',     oldTable: 'ecom_products' },
  order:       { model: 'Order',       oldTable: 'ecom_orders' },
  review:      { model: 'Review',      oldTable: 'ecom_reviews' },
  coupon:      { model: 'Coupon',      oldTable: 'ecom_coupons' },
  subscription:{ model: 'Subscription', oldTable: 'ecom_subscriptions' },
  category:    { model: 'Category',    oldTable: 'ecom_category' },
};

async function main() {
  const ch = createClient({ url: URL!, clickhouse_settings: { readonly: 1, max_execution_time: 120 }, database: CH_DB });
  const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

  let ok = 0, bad = 0, totalOld = 0, totalNew = 0;
  const lines: string[] = [];
  for (const [res, m] of Object.entries(MAP)) {
    const delegate = (p as any)[m.model.charAt(0).toLowerCase() + m.model.slice(1)] ?? (p as any)[m.model];
    const newCount = await delegate.count({ where: { tenantId: TENANT } });
    let oldCount = -1;
    try {
      const rs = await ch.query({ query: `SELECT count() AS c FROM ${CH_DB}.${m.oldTable}`, format: 'JSONEachRow' });
      const rows = await rs.json() as any[];
      oldCount = Number(rows[0]?.c ?? 0);
    } catch { /* table missing on prod */ }
    totalOld += oldCount < 0 ? 0 : oldCount;
    totalNew += newCount;
    const match = oldCount >= 0 && oldCount === newCount;
    if (match) ok++; else { bad++; }
    lines.push(`${match ? 'OK  ' : 'DIFF'} ${res.padEnd(12)} old=${String(oldCount).padStart(9)} new=${String(newCount).padStart(9)}`);
  }
  console.log(lines.join('\n'));
  console.log('='.repeat(40));
  console.log(`OK=${ok} DIFF=${bad}  old_total=${totalOld} new_total=${totalNew}`);
  await ch.close();
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
