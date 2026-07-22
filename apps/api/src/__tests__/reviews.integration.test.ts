// apps/api/src/__tests__/reviews.integration.test.ts
// Phase 9: Reviews — user-generated content linked to Product + User (relations),
// proving the metadata-driven loop handles UGC with FK links and moderation status.
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000p9';
const admin = { uid: 'p9-admin', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any;
const token = signToken(admin);
const auth = { authorization: `Bearer ${token}` };
const inj = (m: string, u: string, p?: any) => app.inject({ method: m, url: u, headers: auth, payload: p });

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 9 — Reviews (e-commerce UGC)', () => {
  let productId: string;
  let userId: string;

  it('seeds a Product and a User to reference', async () => {
    const prod = await inj('POST', '/api/product', { title: 'Widget-' + randomUUID().slice(0, 6), slug: 'w-' + randomUUID().slice(0, 6), price: 50, status: 'active' });
    expect(prod.statusCode).toBe(201);
    productId = prod.json().data.id;
    const user = await inj('POST', '/api/user', { email: 'rev-' + randomUUID().slice(0, 6) + '@x.io', name: 'Rev-' + randomUUID().slice(0, 6), role: 'user', status: 'active' });
    expect(user.statusCode).toBe(201);
    userId = user.json().data.id;
  });

  it('creates a Review linked to the Product + User (FKs)', async () => {
    const res = await inj('POST', '/api/review', { productId, userId, rating: 4, title: 'Nice', body: 'Good product', status: 'approved' });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.productId).toBe(productId);
    expect(res.json().data.userId).toBe(userId);
    expect(res.json().data.rating).toBe(4);
  });

  it('lists Reviews filtered by productId (one-to-many from product)', async () => {
    const res = await inj('GET', `/api/review?filters=${encodeURIComponent(JSON.stringify({ productId }))}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().data.data.length).toBeGreaterThanOrEqual(1);
    expect(res.json().data.data[0].productId).toBe(productId);
  });

  it('exposes relation fields + enum in /api/meta/review', async () => {
    const res = await inj('GET', '/api/meta/review');
    expect(res.json().data.fields.create.productId.type).toBe('relation');
    expect(res.json().data.fields.create.productId.options.resource).toBe('product');
    expect(res.json().data.fields.create.status.type).toBe('enum');
  });

  it('Review appears under the E-commerce nav group', async () => {
    const res = await inj('GET', '/api/meta/nav');
    const ecom = res.json().data.find((s: any) => s.group === 'E-commerce');
    expect(ecom.items.map((i: any) => i.name)).toEqual(expect.arrayContaining(['category', 'product', 'order', 'orderitem', 'review']));
  });
});
