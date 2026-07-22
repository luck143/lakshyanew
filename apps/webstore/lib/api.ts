// apps/webstore/lib/api.ts
// Server-side data access for the SEO storefront. Reads from the public, unauthenticated
// endpoints of the metadata API (ADR-004). Runs only on the server (App Router).

const API_BASE = process.env.API_BASE ?? 'http://localhost:3001';
const TENANT = process.env.DEFAULT_TENANT ?? 'default';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  body?: string;
  status: string;
  tags: string[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string;
  price: number;
  status: string;
  categoryId?: string;
  sku?: string;
  stock?: number;
  cover?: string;
  tags: string[];
}

async function pub<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { 'x-tenant': TENANT }, cache: 'no-store' });
  if (!res.ok) throw new Error(`public API ${path} -> ${res.status}`);
  const json = (await res.json()) as any;
  return json.data as T;
}

function unescapeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function stripBlockHtml(value?: string): string | undefined {
  if (!value) return undefined;
  return unescapeHtml(value)
    .replace(/<\/?p[^>]*>/gi, ' ')
    .replace(/<\/?h[1-6][^>]*>/gi, ' ')
    .replace(/<\/?ul[^>]*>/gi, ' ')
    .replace(/<\/?ol[^>]*>/gi, ' ')
    .replace(/<\/?li[^>]*>/gi, ' ')
    .replace(/<\/?div[^>]*>/gi, ' ')
    .replace(/<\/?br\s*\/?>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function listPosts(): Promise<{ data: BlogPost[]; total: number }> {
  return pub('/api/public/blogpost?limit=50');
}

export function getPost(slug: string): Promise<BlogPost> {
  return pub(`/api/public/blogpost/${encodeURIComponent(slug)}`);
}

export function listCategories(): Promise<{ data: Category[]; total: number }> {
  return pub('/api/public/category?limit=100');
}

export function getCategory(slug: string): Promise<Category> {
  return pub(`/api/public/category/${encodeURIComponent(slug)}`);
}

export async function listProducts(categoryId?: string): Promise<{ data: Product[]; total: number }> {
  const q = categoryId ? `&filters=${encodeURIComponent(JSON.stringify({ categoryId }))}` : '';
  const items = await pub<{ data: Product[]; total: number }>(`/api/public/product?limit=100${q}`);
  items.data.forEach((item) => {
    item.description = stripBlockHtml(item.description);
  });
  return items;
}

export function getProduct(slug: string): Promise<Product> {
  return pub<Product>(`/api/public/product/${encodeURIComponent(slug)}`);
}
