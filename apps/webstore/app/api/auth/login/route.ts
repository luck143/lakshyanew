// apps/webstore/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: API_BASE },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  // Forward Set-Cookie header from API
  const setCookie = res.headers.get('set-cookie');
  const response = NextResponse.json(data, { status: res.status });
  if (setCookie) response.headers.set('set-cookie', setCookie);

  return response;
}