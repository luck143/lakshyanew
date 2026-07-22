// apps/api/src/__tests__/guestCart.integration.test.ts
// Phase 19: Public guest cart — create cart, add item (price snapshot), fetch, remove. No auth.
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { app } from '../server.js';

const TENANT = 'default';
const H = { 'x-tenant': TENANT };
const inj = (m: string, u: string, p?: any) => app.inject({ method: m, url: u, headers: H, payload: p });

async function firstProductId(): Promise<string> {
  const res = await inj('GET', '/api/public/product?limit=1');
  return (res.json().data.data as any[])[0].id;
}

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 19 — guest cart', () => {
  it('creates a cart and adds an item with a price snapshot', async () => {
    const c = await inj('POST', '/api/guest-cart');
    expect(c.statusCode).toBe(201);
    const cartId = c.json().data.id;

    const pid = await firstProductId();
    const add = await inj('POST', `/api/guest-cart/${cartId}/items`, { productId: pid, qty: 2 });
    expect(add.statusCode).toBe(201);
    expect(add.json().data.qty).toBe(2);
    expect(add.json().data.price).toBeGreaterThanOrEqual(0); // price snapshot from product

    const get = await inj('GET', `/api/guest-cart/${cartId}`);
    expect(get.statusCode).toBe(200);
    const cart = get.json().data;
    expect(cart.items.length).toBe(1);
    expect(cart.items[0].productId).toBe(pid);
  });

  it('incrementing the same product updates qty (no duplicate row)', async () => {
    const c = await inj('POST', '/api/guest-cart');
    const cartId = c.json().data.id;
    const pid = await firstProductId();
    await inj('POST', `/api/guest-cart/${cartId}/items`, { productId: pid, qty: 1 });
    await inj('POST', `/api/guest-cart/${cartId}/items`, { productId: pid, qty: 3 });
    const get = await inj('GET', `/api/guest-cart/${cartId}`);
    expect(get.json().data.items.length).toBe(1);
    expect(get.json().data.items[0].qty).toBe(4);
  });

  it('removes an item', async () => {
    const c = await inj('POST', '/api/guest-cart');
    const cartId = c.json().data.id;
    const pid = await firstProductId();
    const add = await inj('POST', `/api/guest-cart/${cartId}/items`, { productId: pid, qty: 1 });
    const itemId = add.json().data.id;
    const del = await inj('DELETE', `/api/guest-cart/${cartId}/item/${itemId}`);
    expect(del.statusCode).toBe(200);
    const get = await inj('GET', `/api/guest-cart/${cartId}`);
    expect(get.json().data.items.length).toBe(0);
  });

  it('rejects adding to a non-existent cart', async () => {
    const pid = await firstProductId();
    const add = await inj('POST', `/api/guest-cart/00000000-0000-0000-0000-000000000000/items`, { productId: pid });
    expect(add.statusCode).toBe(404);
  });
});
