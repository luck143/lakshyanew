// scripts/migrate/lib/clickhouse.ts
// Read-ONLY ClickHouse client for the ETL.
//
// HARD GUARANTEE: this client only ever issues SELECT statements against the
// OLD ClickHouse (the live lakshyaeducation.in source). It is configured with
// `readonly=1` at the connection level AND rejects any non-SELECT query in code.
// No INSERT/UPDATE/DELETE/OPTIMIZE/TRUNCATE is ever issued by the ETL against
// the old database. Production data is never modified or deleted.
import { createClient, type ClickhouseClient } from '@clickhouse/client';

export interface CHConfig {
  url: string;        // e.g. http://readonlyuser:pass@host:8123
  database?: string;  // ClickHouse database name (usually 'default')
}

export function createCHClient(cfg: CHConfig) {
  const client = createClient({
    url: cfg.url,
    // Force read-only at the wire level. ClickHouse rejects writes for such users.
    clickhouse_settings: { readonly: 1, max_execution_time: 300 },
    database: cfg.database ?? 'default',
  });

  // SELECT-only guard: any non-SELECT string throws before hitting the server.
  async function select<T = any>(query: string, params?: Record<string, unknown>): Promise<T[]> {
    const q = query.trim();
    if (!/^select\s/i.test(q)) {
      throw new Error(`ETL CH client拒绝非SELECT语句: ${q.slice(0, 80)}`);
    }
    const rs = await client.query({ query: q, query_params: params, format: 'JSONEachRow' });
    return (await rs.json()) as T[];
  }

  async function close() { await client.close(); }

  return { select, close, raw: client };
}

export type CHClient = ReturnType<typeof createCHClient>;

// --- Old ClickHouse topology -------------------------------------------------
// In the legacy system the CONNECTION NAME (saas | blogdb | gpaadb | lakshya_exp)
// selects the HOST, but the actual ClickHouse DATABASE is `lakshya` (NOT `default`
// — there are several other databases on that server). The CH database can be
// overridden per conn via OLD_CH_DB_<CONN> or globally via OLD_CH_DB.
// A resource's `oldDb` (conn) maps to (host, chDatabase):
//   saas    -> 188.245.85.41,  db=lakshya
//   blogdb  -> 167.235.23.158, db=lakshya
//   gpaadb  -> 78.47.177.68,   db=lakshya
//   lakshya_exp -> (unknown host; default to saas host), db=lakshya_exp
// Hosts come from OLD_CH_URL_<CONN> env (uppercased, non-alnum -> _), else OLD_CH_URL.
const CONN_CH_DB: Record<string, string> = {
  saas: 'lakshya', lakshyadb: 'lakshya', luck: 'lakshya', logdb: 'lakshya',
  ecomdb: 'lakshya', userdb: 'lakshya', blogdb: 'lakshya', gpaadb: 'lakshya',
  lakshya_exp: 'lakshya_exp', lakshyaexp: 'lakshya_exp',
};

export function chDbOf(conn: string): string {
  const key = 'OLD_CH_DB_' + conn.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return process.env[key] ?? CONN_CH_DB[conn] ?? process.env.OLD_CH_DB ?? 'lakshya';
}

export function chUrlForConn(conn: string): string {
  const key = 'OLD_CH_URL_' + conn.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const url = process.env[key] ?? process.env.OLD_CH_URL;
  if (!url) throw new Error(`No ClickHouse URL configured for conn "${conn}" (set ${key} or OLD_CH_URL)`);
  return url;
}

// Build a read-only client for a given old connection (multi-host aware).
export function clientForConn(conn: string): CHClient {
  return createCHClient({ url: chUrlForConn(conn), database: chDbOf(conn) });
}

// Back-compat: keep a db-based helper name used by callers.
export function clientForDb(conn: string): CHClient {
  return clientForConn(conn);
}

// Re-export for callers that only have the @clickhouse/client type.
export type { ClickhouseClient };

