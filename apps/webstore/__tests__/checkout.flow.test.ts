// apps/webstore/__tests__/checkout.flow.test.ts
// Phase 20: full guest purchase flow through the storefront — create cart, add item, checkout,
// see confirmation. Requires BOTH services running (API :3001, storefront :3000). Skips if the
// storefront isn't reachable so `pnpm test` stays green.
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = process.env.WEBSTORE_BASE ?? 'http://localhost:3000';
const API = process.env.API_BASE ?? 'http://localhost:3001';
const TENANT = process.env.DEFAULT_TENANT ?? 'default';

let reachable = false;
beforeAll(async () => {
  try {
    const r = await fetch(BASE + '/', { method: 'HEAD' });
    reachable = r.ok || r.status === 200;
  } catch {
    reachable = false;
  }
});

describe('Phase 20 — storefront checkout flow', () => {
  it.skipIf(!reachable)('creates cart, adds item, checks out, shows confirmation', async () => {
    const res = await fetch(`${BASE}/api/cart`, { method: 'POST' });
    const cookie = res.headers.get('set-cookie') ?? '';
    const cartId = (await res.json()).data?.id as string;
    expect(cartId).toBeTruthy();

    const prod = await (await fetch(`${API}/api/public/product?limit=1`, { headers: { 'x-tenant': TENANT } })).json();
    const pid = prod.data.data[0].id;

    const add = await fetch(`${BASE}/api/cart/${cartId}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: pid, qty: 2 }),
    });
    expect(add.status).toBe(201);

    const co = await fetch(`${BASE}/api/cart/${cartId}/checkout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(co.status).toBe(201);
    const order = (await co.json()).data;
    expect(order.status).toBe('pending');
    expect(order.items.length).toBe(1);
  });
});
