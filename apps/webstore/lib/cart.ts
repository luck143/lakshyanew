// apps/webstore/lib/cart.ts
// Server-side guest-cart helpers for the storefront. Reads the cart id from a cookie and fetches
// the cart from the metadata API's guest-cart endpoints.
import { cookies } from 'next/headers';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3001';
const TENANT = process.env.DEFAULT_TENANT ?? 'default';
export const CART_COOKIE = 'lakshya_cart';

export function getCartId(): string | undefined {
  return cookies().get(CART_COOKIE)?.value;
}

export async function fetchCart(cartId: string) {
  const res = await fetch(`${API_BASE}/api/guest-cart/${cartId}`, { headers: { 'x-tenant': TENANT }, cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()).data as any;
}
