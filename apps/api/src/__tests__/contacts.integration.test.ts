// apps/api/src/__tests__/contacts.integration.test.ts
// Phase 13: CRM Contacts — lead/customer records with tags + status, via the metadata loop.
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000p13';
const admin = { uid: 'p13-admin', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any;
const token = signToken(admin);
const auth = { authorization: `Bearer ${token}` };
const inj = (m: string, u: string, p?: any) => app.inject({ method: m, url: u, headers: auth, payload: p });

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 13 — CRM Contacts', () => {
  it('creates a Contact with tags + status', async () => {
    const res = await inj('POST', '/api/contact', {
      firstName: 'Ada' + randomUUID().slice(0, 4), lastName: 'Lovelace', email: 'ada-' + randomUUID().slice(0, 6) + '@x.io',
      company: 'ACME', tags: ['vip', 'lead'], status: 'lead',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.firstName).toMatch(/^Ada/);
    expect(res.json().data.status).toBe('lead');
    expect(Array.isArray(res.json().data.tags)).toBe(true);
  });

  it('lists contacts filtered by status', async () => {
    await inj('POST', '/api/contact', { firstName: 'Grace' + randomUUID().slice(0, 4), status: 'customer', tags: ['ps'] });
    const res = await inj('GET', `/api/contact?filters=${encodeURIComponent(JSON.stringify({ status: 'customer' }))}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().data.data.length).toBeGreaterThanOrEqual(1);
    expect(res.json().data.data.every((c: any) => c.status === 'customer')).toBe(true);
  });

  it('exposes enum + tags field in /api/meta/contact', async () => {
    const res = await inj('GET', '/api/meta/contact');
    expect(res.json().data.fields.create.status.options).toEqual({ lead: 'Lead', prospect: 'Prospect', customer: 'Customer', churned: 'Churned' });
    expect(res.json().data.fields.create.tags.type).toBe('tags');
  });

  it('Contact appears under a new CRM nav group', async () => {
    const res = await inj('GET', '/api/meta/nav');
    const crm = res.json().data.find((s: any) => s.group === 'CRM');
    expect(crm).toBeTruthy();
    expect(crm.items.map((i: any) => i.name)).toContain('contact');
  });
});
