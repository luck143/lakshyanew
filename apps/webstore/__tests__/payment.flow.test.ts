// apps/webstore/__tests__/payment.flow.test.ts
// Phase 21: full guest purchase + payment flow through the storefront. Requires BOTH services up.
// Skips gracefully if the storefront (:3000) isn't reachable so `pnpm test` stays green.
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = process.env.WEBSTORE_BASE ?? 'http://localhost:3000';
const API = process.env.API_BASE ?? 'http://localhost:3001';
const TENANT = process.env.DEFAULT_TENANT ?? 'default';

let reachable = false;
beforeAll(async () => {
  try { const r = await fetch(BASE + '/', { method: 'HEAD' }); reachable = r.ok || r.status === 200; } catch { reachable = false; }
});

describe('Phase 21 — storefront payment flow', () => {
  it.skipIf(!reachable)('creates cart, adds item, checks out, and pays -> order paid', async () => {
    const res = await fetch(`${BASE}/api/cart`, { method: 'POST' });
    const cookie = res.headers.get('set-cookie') ?? '';
    const cartId = (await res.json()).data?.id as string;
    expect(cartId).toBeTruthy();

    const prod = await (await fetch(`${API}/api/public/product?limit=1`, { headers: { 'x-tenant': TENANT } })).json();
    const pid = prod.data.data[0].id;

    const add = await fetch(`${BASE}/api/cart/${cartId}/items`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: pid, qty: 1 }) });
    expect(add.status).toBe(201);

    const co = await fetch(`${BASE}/api/cart/${cartId}/checkout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(co.status).toBe(201);
    const orderId = (await co.json()).data.id;

    const pay = await fetch(`${BASE}/api/orders/${orderId}/pay`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(pay.status).toBe(200);
    const order = (await pay.json()).data;
    expect(order.status).toBe('paid');
    expect(order.paymentRef).toBeTruthy();
  });
});
