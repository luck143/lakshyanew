// scripts/migrate/prod-counts.ts
// Read-only: print row COUNT of every present old ClickHouse table on the
// configured host. Used to size the full migration and to reconcile afterwards.
import { createClient } from '@clickhouse/client';

const CONN = process.env.OLD_CH_CONN ?? 'saas';
const URL = process.env.OLD_CH_URL_SAAS ?? process.env.OLD_CH_URL;
if (!URL) { console.error('OLD_CH_URL_SAAS / OLD_CH_URL not set'); process.exit(2); }
const DB = process.env.OLD_CH_DB_SAAS ?? 'lakshya';

const TABLES = [
  'in_users', 'in_settings', 'in_domains', 'in_modules', 'in_subscribers',
  'in_invoices', 'in_tickets', 'in_messages', 'lk_topics', 'lk_topicsdb',
  'lk_quiz', 'lk_quizdb', 'lk_quiz_set', 'lk_exams', 'lk_notes', 'lk_liveclass',
  'lk_videolist', 'lk_comments', 'lk_ask_question', 'lk_raise_problems', 'lk_events',
  'lk_tags', 'ecom_products', 'ecom_orders', 'ecom_coupons', 'ecom_reviews',
  'ecom_subscriptions', 'ecom_category', 'ecom_brands', 'ecom_zones',
];

async function main() {
  const ch = createClient({ url: URL!, clickhouse_settings: { readonly: 1, max_execution_time: 120 }, database: DB });
  let total = 0;
  for (const t of TABLES) {
    try {
      const rs = await ch.query({ query: `SELECT count() AS c FROM ${DB}.${t}`, format: 'JSONEachRow' });
      const rows = await rs.json() as any[];
      const c = Number(rows[0]?.c ?? 0);
      total += c;
      console.log(`${String(c).padStart(10)}  ${DB}.${t}`);
    } catch (e: any) {
      console.log(`${'MISSING'.padStart(10)}  ${DB}.${t}  (${e.message?.split('\n')[0] ?? e})`);
    }
  }
  console.log(`${'='.repeat(10)}\n${String(total).padStart(10)}  TOTAL`);
  await ch.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
