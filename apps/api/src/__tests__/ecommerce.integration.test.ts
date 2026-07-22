// apps/api/src/__tests__/ecommerce.integration.test.ts
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000t0';
const token = signToken({ uid: 'a', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any);
const auth = { authorization: `Bearer ${token}` };
const inj = (m: string, u: string, p?: any) => app.inject({ method: m, url: u, headers: auth, payload: p });

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 3 e-commerce: Category + Product with relation', () => {
  let categoryId: string;

  it('POST /api/category creates a category', async () => {
    const slug = 'cat-' + randomUUID().slice(0, 6);
    const res = await inj('POST', '/api/category', { name: 'Books-' + randomUUID().slice(0, 6), slug, status: 'active' });
    expect(res.statusCode).toBe(201);
    categoryId = res.json().data.id;
    expect(res.json().data.name).toContain('Books-');
  });

  it('GET /api/meta/category exposes the parent relation field', async () => {
    const res = await inj('GET', '/api/meta/category');
    expect(res.json().data.fields.create.parentId.type).toBe('relation');
    expect(res.json().data.fields.create.parentId.options.resource).toBe('category');
  });

  it('POST /api/product links to the category via categoryId (FK)', async () => {
    const slug = 'prod-' + randomUUID().slice(0, 6);
    const res = await inj('POST', '/api/product', {
      title: 'Clean Code', slug, price: 29.99, status: 'active', categoryId, stock: 10, tags: ['dev'],
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.categoryId).toBe(categoryId);
    expect(res.json().data.price).toBe(29.99);
  });

  it('GET /api/product/:id returns the stored FK', async () => {
    const slug = 'prod2-' + randomUUID().slice(0, 6);
    const created = await inj('POST', '/api/product', { title: 'Refactoring', slug, price: 39, categoryId });
    const id = created.json().data.id;
    const got = await inj('GET', `/api/product/${id}`);
    expect(got.json().data.categoryId).toBe(categoryId);
  });

  it('product appears in /api/meta list under E-commerce group via nav', async () => {
    const res = await inj('GET', '/api/meta/nav');
    const ecom = res.json().data.find((s: any) => s.group === 'E-commerce');
    expect(ecom).toBeDefined();
    expect(ecom.items.map((i: any) => i.name)).toEqual(expect.arrayContaining(['category', 'product']));
  });

  it('POST /api/product rejects missing required slug', async () => {
    const res = await inj('POST', '/api/product', { title: 'NoSlug', price: 1 });
    expect(res.statusCode).toBe(422);
  });
});
