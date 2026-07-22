// apps/webstore/app/api/cart/[id]/items/route.ts
// Same-origin proxy: add an item to a guest cart.
import { NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3001';
const TENANT = process.env.DEFAULT_TENANT ?? 'default';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const res = await fetch(`${API_BASE}/api/guest-cart/${params.id}/items`, {
    method: 'POST',
    headers: { 'x-tenant': TENANT, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
