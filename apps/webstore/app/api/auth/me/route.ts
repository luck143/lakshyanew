// apps/webstore/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  const cookie = req.headers.get('cookie') || '';
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { cookie },
  });
  const data = await res.json();
  // Forward fresh Set-Cookie if any
  const setCookie = res.headers.get('set-cookie');
  const response = NextResponse.json(data, { status: res.status });
  if (setCookie) response.headers.set('set-cookie', setCookie);
  return response;
}