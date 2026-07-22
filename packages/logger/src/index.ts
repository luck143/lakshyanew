// packages/logger/src/index.ts
// ClickHouse activity-log sink (ADR-005): Postgres is the system of record;
// ClickHouse stores append-only logs (activity, api log, quiz attempts, answer
// logs, rankings). Designed to NEVER break the request path: if CH is down or
// slow, events are buffered in-memory and dropped-on-overflow with a callback.
//
// The insert uses ClickHouse's HTTP interface (port 8123) with
// `INSERT INTO ... FORMAT JSONEachRow`.

export interface ActivityLog {
  tenantId: string;
  userId?: string;
  action: string;        // e.g. "topic.create", "login"
  resource?: string;
  resourceId?: string;
  ip?: string;
  meta?: Record<string, unknown>;
  createdAt?: string;    // ISO; CH fills if omitted
}

export interface LoggerOptions {
  clickhouseUrl?: string;   // e.g. http://localhost:8123 (no credentials embedded)
  user?: string;            // ClickHouse user (default: none)
  password?: string;        // ClickHouse password
  database?: string;       // default "lakshya_logs"
  table?: string;          // default "activity_logs"
  maxBuffer?: number;      // in-memory buffer cap (default 1000)
  onDrop?: (ev: ActivityLog, reason: string) => void;
  fetchImpl?: typeof fetch; // injectable for tests
}

interface BufferedLogger {
  log(ev: ActivityLog): Promise<void>;
  flush(): Promise<number>;
  buffered(): number;
  health(): Promise<boolean>;
  close(): void;
}

export function createLogger(opts: LoggerOptions = {}): BufferedLogger {
  const base = (opts.clickhouseUrl ?? process.env.CLICKHOUSE_URL ?? 'http://localhost:8123').replace(/\/+$/, '');
  const db = opts.database ?? 'lakshya_logs';
  const table = opts.table ?? 'activity_logs';
  const maxBuffer = opts.maxBuffer ?? 1000;
  const doFetch = opts.fetchImpl ?? globalThis.fetch;
  const onDrop = opts.onDrop;
  const auth = (opts.user || opts.password)
    ? `user=${encodeURIComponent(opts.user ?? 'default')}&password=${encodeURIComponent(opts.password ?? '')}`
    : '';
  // Build a ClickHouse request URL: base + auth params + query (query is URL-encoded)
  const reqUrl = (query: string) => `${base}/?${auth}${auth ? '&' : ''}query=${encodeURIComponent(query)}`;

  let buffer: ActivityLog[] = [];
  let closed = false;
  let inflight = 0;

  async function sendBatch(batch: ActivityLog[]): Promise<boolean> {
    if (!doFetch) return false;
    const ndjson = batch
      .map((e) => {
        const row: Record<string, unknown> = { ...e };
        // ClickHouse DateTime expects 'YYYY-MM-DD HH:MM:SS' (no 'Z'/millis)
        if (!e.createdAt) {
          delete row.createdAt; // let CH apply DEFAULT now()
        } else {
          const d = new Date(e.createdAt);
          row.createdAt = d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
        }
        return JSON.stringify(row);
      })
      .join('\n');
    try {
      const res = await doFetch(
        reqUrl(`INSERT INTO ${db}.${table} FORMAT JSONEachRow`),
        { method: 'POST', headers: { 'content-type': 'application/x-ndjson' }, body: ndjson },
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  return {
    async log(ev: ActivityLog) {
      if (closed) { onDrop?.(ev, 'closed'); return; }
      buffer.push(ev);
      if (buffer.length >= maxBuffer) {
        const drop = buffer.shift()!;
        onDrop?.(drop, 'buffer-full');
      }
      // background flush
      if (buffer.length >= 1) {
        const batch = buffer;
        buffer = [];
        inflight++;
        const ok = await sendBatch(batch);
        inflight--;
        if (!ok) {
          // re-buffer on failure (bounded)
          for (const e of batch) {
            if (buffer.length < maxBuffer) buffer.push(e);
            else onDrop?.(e, 'send-failed');
          }
        }
      }
    },
    async flush() {
      const batch = buffer;
      buffer = [];
      if (batch.length === 0) return 0;
      const ok = await sendBatch(batch);
      if (!ok) { for (const e of batch) buffer.push(e); }
      return batch.length;
    },
    buffered() { return buffer.length + inflight; },
    async health() {
      if (!doFetch) return false;
      try {
        const res = await doFetch(`${base}/ping`);
        return res.ok;
      } catch {
        return false;
      }
    },
    close() { closed = true; },
  };
}
