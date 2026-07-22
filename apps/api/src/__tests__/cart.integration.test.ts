// apps/api/src/__tests__/cart.integration.test.ts
// Phase 10: Cart + CartItem — shopping cart with items linked to Product,
// proving the metadata loop handles nested one-to-many (cart -> cartitem -> product).
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000p10';
const admin = { uid: 'p10-admin', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any;
const token = signToken(admin);
const auth = { authorization: `Bearer ${token}` };
const inj = (m: string, u: string, p?: any) => app.inject({ method: m, url: u, headers: auth, payload: p });

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 10 — Cart + CartItem', () => {
  let cartId: string;
  let productId: string;

  it('seeds a Product to put in the cart', async () => {
    const prod = await inj('POST', '/api/product', { title: 'Gadget-' + randomUUID().slice(0, 6), slug: 'g-' + randomUUID().slice(0, 6), price: 99, status: 'active' });
    expect(prod.statusCode).toBe(201);
    productId = prod.json().data.id;
  });

  it('creates a Cart for a user', async () => {
    const user = await inj('POST', '/api/user', { email: 'cart-' + randomUUID().slice(0, 6) + '@x.io', name: 'Cart-' + randomUUID().slice(0, 6), role: 'user', status: 'active' });
    expect(user.statusCode).toBe(201);
    const userId = user.json().data.id;
    const cart = await inj('POST', '/api/cart', { userId, status: 'active' });
    expect(cart.statusCode).toBe(201);
    cartId = cart.json().data.id;
    expect(cart.json().data.userId).toBe(userId);
  });

  it('adds CartItems (links to Product) and lists filtered by cart', async () => {
    const a = await inj('POST', '/api/cartitem', { cartId, productId, qty: 2, price: 99 });
    expect(a.statusCode).toBe(201);
    expect(a.json().data.productId).toBe(productId);
    const b = await inj('POST', '/api/cartitem', { cartId, productId, qty: 1, price: 99 });
    expect(b.statusCode).toBe(201);

    const list = await inj('GET', `/api/cartitem?filters=${encodeURIComponent(JSON.stringify({ cartId }))}`);
    expect(list.statusCode).toBe(200);
    expect(list.json().data.data.length).toBe(2);
  });

  it('exposes relations in /api/meta/cartitem', async () => {
    const res = await inj('GET', '/api/meta/cartitem');
    expect(res.json().data.fields.create.cartId.type).toBe('relation');
    expect(res.json().data.fields.create.productId.options.resource).toBe('product');
  });

  it('Cart appears under E-commerce nav', async () => {
    const res = await inj('GET', '/api/meta/nav');
    const ecom = res.json().data.find((s: any) => s.group === 'E-commerce');
    expect(ecom.items.map((i: any) => i.name)).toEqual(expect.arrayContaining(['category', 'product', 'order', 'orderitem', 'review', 'cart', 'cartitem']));
  });
});
