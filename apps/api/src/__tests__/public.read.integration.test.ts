// apps/api/src/__tests__/public.read.integration.test.ts
// Phase 17a: Public (unauthenticated) read endpoints for the SEO storefront (ADR-004).
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { prisma } from '../crud.js';

const TENANT = '00000000-0000-0000-0000-0000000000p17';
const pub = (u: string, q?: any) => app.inject({ method: 'GET', url: u, headers: { 'x-tenant': TENANT }, ...(q ? { query: q } : {}) });
const mkPost = (title: string, slug: string, status: string) =>
  prisma.blogPost.create({ data: { tenantId: TENANT, title, slug, body: 'body', status } });

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 17 — public read endpoints', () => {
  it('returns only published blog posts, no auth required', async () => {
    const slug = 'pub-' + randomUUID().slice(0, 6);
    await mkPost('Live', slug, 'published');
    await mkPost('Hidden', 'hid-' + randomUUID().slice(0, 6), 'draft');
    const res = await pub('/api/public/blogpost');
    expect(res.statusCode).toBe(200);
    const rows = res.json().data.data as any[];
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.every((r) => r.status === 'published')).toBe(true);
    expect(rows.some((r) => r.title === 'Live')).toBe(true);
    expect(rows.some((r) => r.title === 'Hidden')).toBe(false);
  });

  it('fetches a public detail by slug', async () => {
    const slug = 'detail-' + randomUUID().slice(0, 6);
    await mkPost('Detail', slug, 'published');
    const res = await pub(`/api/public/blogpost/${slug}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().data.title).toBe('Detail');
  });

  it('404s a draft detail (not public)', async () => {
    const slug = 'draft-' + randomUUID().slice(0, 6);
    await mkPost('Draft', slug, 'draft');
    const res = await pub(`/api/public/blogpost/${slug}`);
    expect(res.statusCode).toBe(404);
  });

  it('rejects public listing of a non-public resource (e.g. user)', async () => {
    const res = await pub('/api/public/user');
    expect(res.statusCode).toBe(403);
  });
});
