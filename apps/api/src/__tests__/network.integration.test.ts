// apps/api/src/__tests__/network.integration.test.ts
// Phase 23 — Network + Publisher admin domain resources.
// Verifies the metadata-driven CRUD loop works for these resources reverse-
// engineered from old ClickHouse network/* + publisher/* packages.
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000t0';
const token = signToken({ uid: 'a', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any);
const auth = { authorization: `Bearer ${token}` };
const pubToken = signToken({ uid: 'p', tenantId: TENANT, role: 'publisher', permissions: ['role_superadmin'], status: 'active' } as any);

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' });
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

async function makeUser(): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/api/user', headers: auth, payload: { email: `u-${randomUUID().slice(0, 6)}@x.com`, name: 'U', role: 'user', status: 'active' } });
  return r.json().data.id;
}

describe('Phase 23 Network/Publisher resources', () => {
  let uid: string;
  beforeAll(async () => { uid = await makeUser(); });

  it('all network/publisher resources present in /api/meta', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/meta', headers: auth });
    expect(res.json().data).toEqual(expect.arrayContaining([
      'invoice', 'ticket', 'staff', 'domain', 'module', 'subscriber', 'event', 'notice', 'publisherprofile', 'publishertoken',
    ]));
  });

  it('POST /api/invoice creates; GET filters by status', async () => {
    const c = await app.inject({ method: 'POST', url: '/api/invoice', headers: auth, payload: { title: 'INV-' + randomUUID().slice(0, 6), amount: 499, uid, type: 'subscription' } });
    expect(c.statusCode).toBe(201);
    const l = await app.inject({ method: 'GET', url: '/api/invoice?filters=' + encodeURIComponent(JSON.stringify({ status: 'pending' })), headers: auth });
    expect(l.json().data.data.every((r: any) => r.status === 'pending')).toBe(true);
  });

  it('POST /api/ticket creates with self-relation parent', async () => {
    const parent = await app.inject({ method: 'POST', url: '/api/ticket', headers: auth, payload: { title: 'T-' + randomUUID().slice(0, 6), message: 'root' } });
    expect(parent.statusCode).toBe(201);
    const child = await app.inject({ method: 'POST', url: '/api/ticket', headers: auth, payload: { title: 'T2-' + randomUUID().slice(0, 6), message: 'reply', parent: parent.json().data.id } });
    expect(child.statusCode).toBe(201);
    expect(child.json().data.parent).toBe(parent.json().data.id);
  });

  it('POST /api/staff creates; name is unique', async () => {
    const c = await app.inject({ method: 'POST', url: '/api/staff', headers: auth, payload: { name: 'Staff-' + randomUUID().slice(0, 6), email: 's@x.com' } });
    expect(c.statusCode).toBe(201);
  });

  it('POST /api/domain rejects duplicate name (unique)', async () => {
    const name = 'd-' + randomUUID().slice(0, 6) + '.com';
    const c = await app.inject({ method: 'POST', url: '/api/domain', headers: auth, payload: { name } });
    expect(c.statusCode).toBe(201);
    const dup = await app.inject({ method: 'POST', url: '/api/domain', headers: auth, payload: { name } });
    expect(dup.statusCode).toBe(409);
  });

  it('POST /api/module creates with self-relation', async () => {
    const p = await app.inject({ method: 'POST', url: '/api/module', headers: auth, payload: { name: 'Mod-' + randomUUID().slice(0, 6), subscriptionType: 'free' } });
    expect(p.statusCode).toBe(201);
    const c = await app.inject({ method: 'POST', url: '/api/module', headers: auth, payload: { name: 'Sub-' + randomUUID().slice(0, 6), parent: p.json().data.id } });
    expect(c.statusCode).toBe(201);
    expect(c.json().data.parent).toBe(p.json().data.id);
  });

  it('POST /api/subscriber creates; GET filters by status', async () => {
    const c = await app.inject({ method: 'POST', url: '/api/subscriber', headers: auth, payload: { name: 'Sub-' + randomUUID().slice(0, 6), email: 'sub@x.com', status: 'active' } });
    expect(c.statusCode).toBe(201);
    const l = await app.inject({ method: 'GET', url: '/api/subscriber?filters=' + encodeURIComponent(JSON.stringify({ status: 'active' })), headers: auth });
    expect(l.json().data.data.every((r: any) => r.status === 'active')).toBe(true);
  });

  it('POST /api/event creates', async () => {
    const c = await app.inject({ method: 'POST', url: '/api/event', headers: auth, payload: { name: 'E-' + randomUUID().slice(0, 6), email: 'e@x.com', uid, status: 'new' } });
    expect(c.statusCode).toBe(201);
  });

  it('POST /api/notice creates', async () => {
    const c = await app.inject({ method: 'POST', url: '/api/notice', headers: auth, payload: { message: 'Hello', type: 'inapp', toid: uid, totype: 'user' } });
    expect(c.statusCode).toBe(201);
  });

  it('publisher can manage publisherprofile + publishertoken', async () => {
    const p = await app.inject({ method: 'POST', url: '/api/publisherprofile', headers: { authorization: `Bearer ${pubToken}` }, payload: { name: 'Pub-' + randomUUID().slice(0, 6), companyname: 'Acme', email: 'pub@x.com' } });
    expect(p.statusCode).toBe(201);
    const t = await app.inject({ method: 'POST', url: '/api/publishertoken', headers: { authorization: `Bearer ${pubToken}` }, payload: { name: 'Tok-' + randomUUID().slice(0, 6), token: 'sec-xyz', status: 'active' } });
    expect(t.statusCode).toBe(201);
  });
});
