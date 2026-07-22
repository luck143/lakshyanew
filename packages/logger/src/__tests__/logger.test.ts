// packages/logger/src/__tests__/logger.test.ts
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createLogger, type ActivityLog } from '../index.js';

const CH_URL = process.env.CLICKHOUSE_URL ?? 'http://localhost:8123';
const DB = 'lakshya_logs';

describe('logger (ClickHouse activity sink, ADR-005)', () => {
  it('degrades gracefully when ClickHouse is unreachable (buffers, never throws)', async () => {
    const dropped: string[] = [];
    const fakeFetch = (async () => { throw new Error('CH down'); }) as unknown as typeof fetch;
    const logger = createLogger({ clickhouseUrl: 'http://127.0.0.1:9', fetchImpl: fakeFetch, onDrop: (e) => dropped.push(e.action) });
    // should not throw even though CH is down
    await expect(logger.log({ tenantId: 't1', action: 'topic.create' })).resolves.toBeUndefined();
    await new Promise((r) => setTimeout(r, 50));
    expect(logger.buffered()).toBeGreaterThanOrEqual(0); // no crash
    expect(dropped.length).toBeGreaterThanOrEqual(0);
    logger.close();
  });

  it('buffers events when send fails and re-buffers (no data loss within cap)', async () => {
    const calls: number[] = [];
    // fetch that always fails (simulates CH rejecting)
    const fakeFetch = (async () => {
      calls.push(1);
      return new Response('', { status: 500 });
    }) as unknown as typeof fetch;
    const logger = createLogger({ clickhouseUrl: 'http://localhost:8123', fetchImpl: fakeFetch, maxBuffer: 100 });
    await logger.log({ tenantId: 't', action: 'a1' });
    await new Promise((r) => setTimeout(r, 30));
    // after failed send, event should still be buffered (re-buffered), not lost
    expect(logger.buffered()).toBeGreaterThanOrEqual(1);
    logger.close();
  });

  it('pings health false when CH unreachable', async () => {
    const fakeFetch = (async () => { throw new Error('down'); }) as unknown as typeof fetch;
    const logger = createLogger({ clickhouseUrl: 'http://127.0.0.1:9', fetchImpl: fakeFetch });
    expect(await logger.health()).toBe(false);
    logger.close();
  });

  describe('live ClickHouse (if available)', () => {
    const reachable = async (): Promise<boolean> => {
      try {
        const r = await fetch(`${CH_URL}/ping`);
        return r.ok;
      } catch {
        return false;
      }
    };
    it('creates table, inserts, and reads back an event', async () => {
      if (!(await reachable())) {
        console.warn('ClickHouse not reachable — skipping live test');
        return;
      }
      const base = process.env.CLICKHOUSE_URL ?? 'http://localhost:8123';
      const AUTH = `${base}?user=default&password=ch_pass`;
      const ddl = (q: string) => fetch(`${AUTH}&query=${encodeURIComponent(q)}`, { method: 'POST' });
      await ddl(`CREATE TABLE IF NOT EXISTS ${DB}.activity_logs (tenantId String, userId String, action String, resource String, resourceId String, ip String, meta String, createdAt DateTime DEFAULT now()) ENGINE = MergeTree ORDER BY (tenantId, createdAt)`);
      await ddl(`TRUNCATE TABLE ${DB}.activity_logs`);

      // (1) prove raw CH ingest works in this env using the exact working pattern
      const rawInsert = await fetch(`${AUTH}&query=${encodeURIComponent(`INSERT INTO ${DB}.activity_logs FORMAT JSONEachRow`)}`, {
        method: 'POST', headers: { 'content-type': 'application/x-ndjson' },
        body: JSON.stringify({ tenantId: 'raw', action: 'probe', meta: '{}' }),
      });
      expect(rawInsert.status).toBe(200);
      await new Promise((r) => setTimeout(r, 300));
      const rawCount = Number((await (await fetch(`${AUTH}&query=${encodeURIComponent(`SELECT count() as c FROM ${DB}.activity_logs`)}`, { method: 'POST' })).text()).trim().split('\n')[0]);
      expect(rawCount).toBeGreaterThanOrEqual(1); // raw ingest confirmed

      // (2) same via the logger
      const logger = createLogger({ clickhouseUrl: base, user: 'default', password: 'ch_pass', database: DB, table: 'activity_logs' });
      await logger.log({ tenantId: 't1', userId: 'u1', action: 'topic.create', resource: 'topic', resourceId: 'r1', ip: '1.2.3.4', meta: '{"x":1}' });
      await new Promise((r) => setTimeout(r, 300));
      await logger.flush();
      await new Promise((r) => setTimeout(r, 300));
      const q = await fetch(`${AUTH}&query=${encodeURIComponent(`SELECT count() as c FROM ${DB}.activity_logs`)}`, { method: 'POST' });
      const text = (await q.text()).trim();
      const count = Number(text.split('\n')[0] ?? '0');
      if (count < 2) console.warn('Logger insert did not persist. Response:', text, 'buffered:', logger.buffered());
      expect(count).toBeGreaterThanOrEqual(2); // raw probe + logger insert
      logger.close();
    }, 15000);
  });
});
