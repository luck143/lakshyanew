// apps/api/src/__tests__/subscriptions.integration.test.ts
// Phase 12: Subscriptions — recurring plans linked to a User, via the metadata loop.
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000p12';
const admin = { uid: 'p12-admin', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any;
const token = signToken(admin);
const auth = { authorization: `Bearer ${token}` };
const inj = (m: string, u: string, p?: any) => app.inject({ method: m, url: u, headers: auth, payload: p });

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 12 — Subscriptions', () => {
  it('creates a Subscription linked to a User (FK)', async () => {
    const user = await inj('POST', '/api/user', { email: 'sub-' + randomUUID().slice(0, 6) + '@x.io', name: 'Sub-' + randomUUID().slice(0, 6), role: 'user', status: 'active' });
    expect(user.statusCode).toBe(201);
    const userId = user.json().data.id;
    const res = await inj('POST', '/api/subscription', {
      userId, plan: 'pro-monthly', status: 'active', amount: 499, currency: 'INR', interval: 'month',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.userId).toBe(userId);
    expect(res.json().data.plan).toBe('pro-monthly');
    expect(res.json().data.interval).toBe('month');
  });

  it('exposes relation + enum in /api/meta/subscription', async () => {
    const res = await inj('GET', '/api/meta/subscription');
    expect(res.json().data.fields.create.userId.type).toBe('relation');
    expect(res.json().data.fields.create.status.options).toEqual({ trialing: 'Trialing', active: 'Active', past_due: 'Past Due', canceled: 'Canceled' });
  });

  it('Subscription appears under E-commerce nav', async () => {
    const res = await inj('GET', '/api/meta/nav');
    const ecom = res.json().data.find((s: any) => s.group === 'E-commerce');
    expect(ecom.items.map((i: any) => i.name)).toEqual(expect.arrayContaining(['category', 'product', 'order', 'orderitem', 'review', 'cart', 'cartitem', 'coupon', 'subscription']));
  });
});
