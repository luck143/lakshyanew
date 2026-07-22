// apps/api/src/__tests__/orders.integration.test.ts
// Phase 5: Orders + OrderItems with FKs to User/Product (one-to-many).
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000p5';
const admin = { uid: 'p5-admin', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any;
const token = signToken(admin);
const auth = { authorization: `Bearer ${token}` };
const inj = (m: string, u: string, p?: any) => app.inject({ method: m, url: u, headers: auth, payload: p });

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 5 — Orders + OrderItems (relational e-commerce)', () => {
  let productId: string;
  let userId: string;
  let orderId: string;

  it('creates a Product and a User to reference', async () => {
    const prod = await inj('POST', '/api/product', { title: 'Book-' + randomUUID().slice(0, 6), slug: 'bk-' + randomUUID().slice(0, 6), price: 100, status: 'active' });
    expect(prod.statusCode).toBe(201);
    productId = prod.json().data.id;

    const user = await inj('POST', '/api/user', { email: 'cust-' + randomUUID().slice(0, 6) + '@x.io', name: 'Cust-' + randomUUID().slice(0, 6), role: 'user', status: 'active' });
    expect(user.statusCode).toBe(201);
    userId = user.json().data.id;
  });

  it('creates an Order linked to the User (FK)', async () => {
    const res = await inj('POST', '/api/order', { userId, status: 'pending', total: 200, currency: 'INR' });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.userId).toBe(userId);
    orderId = res.json().data.id;
  });

  it('creates OrderItems linked to the Order + Product (FKs)', async () => {
    const a = await inj('POST', '/api/orderitem', { orderId, productId, qty: 2, price: 100 });
    expect(a.statusCode).toBe(201);
    expect(a.json().data.orderId).toBe(orderId);
    expect(a.json().data.productId).toBe(productId);
    expect(a.json().data.qty).toBe(2);

    const b = await inj('POST', '/api/orderitem', { orderId, productId, qty: 1, price: 100 });
    expect(b.statusCode).toBe(201);
  });

  it('lists OrderItems filtered by orderId (one-to-many)', async () => {
    const res = await inj('GET', `/api/orderitem?filters=${encodeURIComponent(JSON.stringify({ orderId }))}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().data.data.length).toBe(2);
  });

  it('GET /api/meta/order exposes the userId relation field', async () => {
    const res = await inj('GET', '/api/meta/order');
    expect(res.json().data.fields.create.userId.type).toBe('relation');
    expect(res.json().data.fields.create.userId.options.resource).toBe('user');
  });

  it('order appears under E-commerce nav group', async () => {
    const res = await inj('GET', '/api/meta/nav');
    const ecom = res.json().data.find((s: any) => s.group === 'E-commerce');
    expect(ecom.items.map((i: any) => i.name)).toEqual(expect.arrayContaining(['category', 'product', 'order', 'orderitem']));
  });
});
