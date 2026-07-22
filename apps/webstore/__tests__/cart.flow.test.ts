// apps/webstore/__tests__/cart.flow.test.ts
// Phase 19: guest cart flow through the storefront's same-origin proxy + SSR cart page.
// Requires BOTH services running: API (apps/api) on API_BASE (default :3001) and the storefront
// (apps/webstore) on WEBSTORE_BASE (default :3000, started via `pnpm start`). Skips gracefully if
// the storefront isn't reachable so `pnpm test` stays green; run it after starting both services.
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

describe('Phase 19 — storefront cart flow', () => {
  it.skipIf(!reachable)('creates a cart (cookie set) and the cart page renders it', async () => {
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

    const page = await fetch(`${BASE}/cart`, { headers: { cookie } });
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('Cart');
    expect(html).toContain('Total');
  });
});
