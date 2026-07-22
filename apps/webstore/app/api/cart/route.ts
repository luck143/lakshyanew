// apps/webstore/app/api/cart/route.ts
// Same-origin proxy: create a guest cart. Sets the lakshya_cart cookie.
import { NextResponse } from 'next/server';
import { CART_COOKIE } from '@/lib/cart';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3001';
const TENANT = process.env.DEFAULT_TENANT ?? 'default';

export async function POST() {
  const res = await fetch(`${API_BASE}/api/guest-cart`, { method: 'POST', headers: { 'x-tenant': TENANT } });
  const json = await res.json();
  const cartId = json.data?.id;
  const r = NextResponse.json(json);
  if (cartId) r.cookies.set(CART_COOKIE, cartId, { httpOnly: true, path: '/', sameSite: 'lax' });
  return r;
}
