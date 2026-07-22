// apps/api/src/__tests__/blog.integration.test.ts
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000t0';
const token = signToken({ uid: 'a', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any);
const auth = { authorization: `Bearer ${token}` };

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' });
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 1 Blog resource (metadata-driven, no new admin code)', () => {
  let id: string;

  it('GET /api/meta/blogpost returns blogpost schema', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/meta/blogpost', headers: auth });
    expect(res.json().status).toBe(1);
    expect(res.json().data.name).toBe('blogpost');
    expect(res.json().data.listView.columns).toEqual(
      expect.objectContaining({ title: 'Title', status: 'Status' }),
    );
  });

  it('blogpost appears in /api/meta list', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/meta', headers: auth });
    expect(res.json().data).toEqual(expect.arrayContaining(['topic', 'blogpost', 'user', 'tenant']));
  });

  it('POST /api/blogpost creates (tags array accepted)', async () => {
    const slug = 'post-' + randomUUID().slice(0, 6);
    const res = await app.inject({
      method: 'POST', url: '/api/blogpost', headers: auth,
      payload: { title: 'Hello', slug, status: 'published', tags: ['edu', 'news'] },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.tags).toEqual(['edu', 'news']);
    id = res.json().data.id;
  });

  it('PATCH /api/blogpost updates status', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/blogpost/${id}`, headers: auth, payload: { status: 'archived' },
    });
    expect(res.json().data.status).toBe('archived');
  });

  it('POST /api/blogpost rejects missing required slug', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/blogpost', headers: auth, payload: { title: 'NoSlug' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('DELETE /api/blogpost removes it', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/blogpost/${id}`, headers: auth });
    expect(res.json().status).toBe(1);
  });
});
