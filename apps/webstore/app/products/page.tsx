// apps/webstore/app/products/page.tsx
// Product listing: Server-rendered on demand (fresh from public API).
import Link from 'next/link';
import { listProducts, listCategories } from '@/lib/api';
import { Placeholder } from '@/components/Placeholder';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: { searchParams: { cat?: string } }) {
  const cat = searchParams.cat;
  let products: { data: any[] } = { data: [] };
  let categories: { data: any[] } = { data: [] };
  try {
    [products, categories] = await Promise.all([listProducts(), listCategories()]);
  } catch {}
  const active = categories.data.find((c: any) => c.slug === cat);
  const items = cat ? products.data.filter((p) => p.tags?.includes(cat)) : products.data;
  const strip = (v?: string) => v ? v.replace(/<[^>]+>/g, ' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim() : '—';
  return (
    <section className="container" style={{ padding: '48px 22px' }}>
      <div className="section-head">
        <div>
          <h2>{active ? active.name : 'Shop'}</h2>
          <p>{items.length} item{items.length === 1 ? '' : 's'}{active ? ` in ${active.name}` : ''}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <Link className="tag" href="/products" style={{ textDecoration: 'none' }}>All</Link>
        {categories.data.map((c: any) => (
          <Link key={c.id} className="tag" href={`/products?cat=${c.slug}`} style={{ textDecoration: 'none', opacity: cat === c.slug ? 1 : .7 }}>{c.name}</Link>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="empty">No products here yet.</div>
      ) : (
        <div className="grid cards">
          {items.map((p) => (
            <Link key={p.id} className="card" href={`/products/${p.slug}`} style={{ color: 'inherit' }}>
              <Placeholder kind="product" seed={p.id} tags={p.tags} label={p.title} size="md" />
              <h3>{p.title}</h3>
              <p className="desc">{strip(p.description ?? '—').slice(0, 96)}</p>
              <div className="row">
                <span className="price">₹{p.price}</span>
                <span className="cat-pill">{p.tags?.[0] ?? 'item'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
