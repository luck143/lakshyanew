// apps/webstore/app/api/orders/[id]/pay/route.ts
// Same-origin proxy: pay an order via the configured gateway.
import { NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3001';
const TENANT = process.env.DEFAULT_TENANT ?? 'default';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const res = await fetch(`${API_BASE}/api/orders/${params.id}/pay`, {
    method: 'POST',
    headers: { 'x-tenant': TENANT, 'content-type': 'application/json' },
    body: '{}',
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
