// apps/api/src/__tests__/payment.integration.test.ts
// Phase 21: pay an order via the (mock) gateway -> status pending -> paid, paymentRef set.
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

describe('Phase 21 — payment', () => {
  it('pays a pending order -> status paid + paymentRef', async () => {
    const c = await inj('POST', '/api/guest-cart');
    const cartId = c.json().data.id;
    const pid = await firstProductId();
    await inj('POST', `/api/guest-cart/${cartId}/items`, { productId: pid, qty: 1 });
    const co = await inj('POST', `/api/guest-cart/${cartId}/checkout`, {});
    const orderId = co.json().data.id;

    const pay = await inj('POST', `/api/orders/${orderId}/pay`, {});
    expect(pay.statusCode).toBe(200);
    const order = pay.json().data;
    expect(order.status).toBe('paid');
    expect(order.paymentRef).toBeTruthy();
    expect(order.paidAt).toBeTruthy();
  });

  it('returns 404 for paying a non-existent order', async () => {
    const pay = await inj('POST', `/api/orders/00000000-0000-0000-0000-000000000000/pay`, {});
    expect(pay.statusCode).toBe(404);
  });

  it('idempotent: paying an already-paid order stays paid', async () => {
    const c = await inj('POST', '/api/guest-cart');
    const cartId = c.json().data.id;
    const pid = await firstProductId();
    await inj('POST', `/api/guest-cart/${cartId}/items`, { productId: pid, qty: 1 });
    const orderId = (await inj('POST', `/api/guest-cart/${cartId}/checkout`, {})).json().data.id;
    await inj('POST', `/api/orders/${orderId}/pay`, {});
    const pay2 = await inj('POST', `/api/orders/${orderId}/pay`, {});
    expect(pay2.statusCode).toBe(200);
    expect(pay2.json().data.status).toBe('paid');
  });
});
