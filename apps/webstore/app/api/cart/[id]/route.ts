// apps/webstore/app/api/cart/[id]/route.ts
// Same-origin proxy: fetch a guest cart.
import { NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3001';
const TENANT = process.env.DEFAULT_TENANT ?? 'default';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const res = await fetch(`${API_BASE}/api/guest-cart/${params.id}`, { headers: { 'x-tenant': TENANT }, cache: 'no-store' });
  return NextResponse.json(await res.json(), { status: res.status });
}
