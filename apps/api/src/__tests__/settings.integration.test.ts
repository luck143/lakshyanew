// apps/api/src/__tests__/settings.integration.test.ts
// Phase 15: Settings & Configuration — key/value (json) config store, metadata-driven.
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000p15';
const admin = { uid: 'p15-admin', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any;
const token = signToken(admin);
const auth = { authorization: `Bearer ${token}` };
const inj = (m: string, u: string, p?: any) => app.inject({ method: m, url: u, headers: auth, payload: p });

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 15 — Settings & Configuration', () => {
  it('creates a Setting with a JSON value (object) that round-trips', async () => {
    const key = 'seo-' + randomUUID().slice(0, 6);
    const res = await inj('POST', '/api/setting', { key, group: 'seo', label: 'SEO config', value: { title: 'Lakshya', ogImage: '/media/x.png' } });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.key).toBe(key);
    expect(res.json().data.value).toEqual({ title: 'Lakshya', ogImage: '/media/x.png' });
  });

  it('permits a duplicate setting key at the DB level (Strategy A: legacy data has dupes, so the (tenantId,key) unique was dropped; uniqueness is app-level/deferred)', async () => {
    const key = 'dup-' + randomUUID().slice(0, 6);
    const a = await inj('POST', '/api/setting', { key, group: 'general', value: 'one' });
    expect(a.statusCode).toBe(201);
    const b = await inj('POST', '/api/setting', { key, group: 'general', value: 'two' });
    expect(b.statusCode).toBe(201);
  });

  it('exposes the json field type in /api/meta/setting', async () => {
    const res = await inj('GET', '/api/meta/setting');
    expect(res.json().data.fields.create.value.type).toBe('json');
  });

  it('Setting appears under a new Settings nav group', async () => {
    const res = await inj('GET', '/api/meta/nav');
    const settings = res.json().data.find((s: any) => s.group === 'Settings');
    expect(settings).toBeTruthy();
    expect(settings.items.map((i: any) => i.name)).toContain('setting');
  });
});
