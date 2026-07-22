// apps/webstore/lib/auth.ts
// Client-side auth: login, register, logout, get user from cookie.
// Uses Next.js API proxy routes so cookies are same-origin.

export interface AuthUser {
  uid: string;
  email: string;
  name?: string;
  role: string;
  permissions: string[];
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || 'Login failed');
  return json?.data as AuthUser;
}

export async function register(email: string, password: string, name?: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || 'Registration failed');
  return json?.data as AuthUser;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function getUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}