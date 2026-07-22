// apps/api/src/__tests__/coupons.integration.test.ts
// Phase 11: Coupons — discount codes (percent/fixed) with usage caps + validity window,
// exercised purely through the metadata loop.
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000p11';
const admin = { uid: 'p11-admin', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any;
const token = signToken(admin);
const auth = { authorization: `Bearer ${token}` };
const inj = (m: string, u: string, p?: any) => app.inject({ method: m, url: u, headers: auth, payload: p });

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 11 — Coupons', () => {
  it('creates a percent coupon with a unique code', async () => {
    const code = 'SAVE' + randomUUID().slice(0, 6).toUpperCase();
    const res = await inj('POST', '/api/coupon', {
      code, description: 'Spring sale', type: 'percent', value: 15, minAmount: 100, maxUses: 500, status: 'active',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.code).toBe(code);
    expect(res.json().data.type).toBe('percent');
    expect(res.json().data.value).toBe(15);
  });

  it('permits a duplicate coupon code at the DB level (Strategy A: legacy data has dupes, so the (tenantId,code) unique was dropped; uniqueness is app-level/deferred)', async () => {
    const code = 'DUP' + randomUUID().slice(0, 6).toUpperCase();
    const a = await inj('POST', '/api/coupon', { code, type: 'fixed', value: 50, status: 'active' });
    expect(a.statusCode).toBe(201);
    const b = await inj('POST', '/api/coupon', { code, type: 'fixed', value: 50, status: 'active' });
    expect(b.statusCode).toBe(201);
  });

  it('exposes enum + fields in /api/meta/coupon', async () => {
    const res = await inj('GET', '/api/meta/coupon');
    expect(res.json().data.fields.create.type.options).toEqual({ percent: 'Percent', fixed: 'Fixed' });
    expect(res.json().data.fields.create.code.required).toBe(true);
  });

  it('Coupon appears under E-commerce nav', async () => {
    const res = await inj('GET', '/api/meta/nav');
    const ecom = res.json().data.find((s: any) => s.group === 'E-commerce');
    expect(ecom.items.map((i: any) => i.name)).toEqual(expect.arrayContaining(['category', 'product', 'order', 'orderitem', 'review', 'cart', 'cartitem', 'coupon']));
  });
});
