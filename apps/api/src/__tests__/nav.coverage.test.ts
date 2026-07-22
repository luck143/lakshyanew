// apps/api/src/__tests__/nav.coverage.test.ts
// Proves the admin panel's navigation is fully metadata-driven: every defined
// resource must appear in /api/meta/nav (grouped by its `group`) for a
// superadmin. This is the link between "API-first" and "dynamic admin" — if a
// resource is defined in resources.ts it auto-appears in the admin sidebar.
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { app } from '../server.js';
import { signToken } from '../auth.js';
import { registry } from '@lakshya/core';

const TENANT = '00000000-0000-0000-0000-00000000nav';
const admin = { uid: 'nav-admin', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any;
const token = signToken(admin);
const auth = { authorization: `Bearer ${token}` };
const inj = (m: string, u: string) => app.inject({ method: m, url: u, headers: auth });

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Admin nav is fully metadata-driven', () => {
  it('lists every defined resource in /api/meta/nav', async () => {
    const res = await inj('GET', '/api/meta/nav');
    expect(res.statusCode).toBe(200);
    const sections = res.json().data as { group: string; items: { name: string }[] }[];
    const navKeys = new Set(sections.flatMap((s) => s.items.map((i) => i.name)));

    // Every business resource in the registry (except Tenant, which is
    // infrastructure, not a sidebar entry) must appear in the nav.
    const expected = registry.all().map((r) => r.name).filter((n) => n !== 'tenant');
    for (const key of expected) {
      expect(navKeys.has(key), `resource "${key}" missing from admin nav`).toBe(true);
    }
    // Sanity: nav should actually contain resources, not be empty.
    expect(navKeys.size).toBeGreaterThanOrEqual(expected.length);
    console.log(`[nav] ${navKeys.size} resources surfaced in admin nav`);
  });
});
