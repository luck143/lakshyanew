// apps/webstore/__tests__/storefront.data.test.ts
// Phase 17 + 18: the storefront data layer (lib/api) reads published CMS + e-commerce content
// from the metadata API. Requires the API (apps/api) running on API_BASE (default :3001) with
// published posts/products/categories in the DEFAULT_TENANT ('default').
import { describe, it, expect } from 'vitest';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3001';
const TENANT = process.env.DEFAULT_TENANT ?? 'default';

async function getJson(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { 'x-tenant': TENANT } });
  if (!res.ok) throw new Error('api ' + res.status);
  return (await res.json()).data as any;
}

describe('Phase 17/18 — storefront data layer', () => {
  // Blog is deferred: it lives on a SEPARATE ClickHouse server
  // (167.235.23.158) and is excluded from this migration (user decision).
  // These two tests remain skipped until the blog migration lands.
  it.skip('fetches published blog posts', async () => {
    const data = await getJson('/api/public/blogpost?limit=50');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(1);
    expect(data.data.every((p: any) => p.status === 'published')).toBe(true);
  });

  it.skip('fetches a single published post by slug', async () => {
    const data = await getJson('/api/public/blogpost?limit=50');
    const slug = data.data[0].slug;
    const post = await getJson(`/api/public/blogpost/${encodeURIComponent(slug)}`);
    expect(post.slug).toBe(slug);
  });

  it('fetches active products (e-commerce)', async () => {
    const data = await getJson('/api/public/product?limit=100');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(1);
    expect(data.data.every((p: any) => p.status === 'active')).toBe(true);
  });

  it('fetches a single product by slug', async () => {
    const data = await getJson('/api/public/product?limit=100');
    const slug = data.data[0].slug;
    const product = await getJson(`/api/public/product/${encodeURIComponent(slug)}`);
    expect(product.slug).toBe(slug);
  });

  it('filters products by category', async () => {
    const cats = await getJson('/api/public/category?limit=100');
    const cat = cats.data[0];
    const data = await getJson(`/api/public/product?limit=100&filters=${encodeURIComponent(JSON.stringify({ categoryId: cat.id }))}`);
    expect(data.data.every((p: any) => p.categoryId === cat.id)).toBe(true);
  });
});
