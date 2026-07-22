// apps/webstore/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

export async function POST() {
  const res = await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  const data = await res.json();
  const setCookie = res.headers.get('set-cookie');
  const response = NextResponse.json(data, { status: res.status });
  if (setCookie) response.headers.set('set-cookie', setCookie);
  return response;
}