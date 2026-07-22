// apps/webstore/app/page.tsx
// Home: Server-Side Rendered (dynamic) — always fresh from the public API.
import Link from 'next/link';
import { listPosts, listProducts, listCategories } from '@/lib/api';
import { Placeholder } from '@/components/Placeholder';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let products: { data: any[] } = { data: [] };
  let posts: { data: any[] } = { data: [] };
  let categories: { data: any[] } = { data: [] };
  try {
    [products, posts, categories] = await Promise.all([listProducts(), listPosts(), listCategories()]);
  } catch {
    // API down: render shell gracefully
  }
  const featured = products.data.slice(0, 8);
  const latest = posts.data.slice(0, 3);
  return (
    <>
      <section className="hero">
        <div className="container">
          <div>
            <h1>Level up your <span className="hl">engineering</span> career.</h1>
            <p>Books, courses and articles on JavaScript, TypeScript, React, Node and system design — written for builders.</p>
            <div className="cta">
              <a className="btn" href="/products">Browse the shop</a>
              <a className="btn ghost" href="/blog">Read the blog</a>
            </div>
          </div>
          <div className="hero-art">
            <span className="badge">🌱 Start free, go far</span>
            <h3>What you get</h3>
            <ul>
              <li>Example-driven, production-real content</li>
              <li>Books &amp; courses that compound</li>
              <li>Lifetime updates on bundles</li>
              <li>Learn at your own pace</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="container">
        <div className="section-head">
          <div><h2>Featured products</h2><p>Hand-picked books, courses and bundles.</p></div>
          <Link className="btn ghost" href="/products">View all →</Link>
        </div>
        {featured.length === 0 ? (
          <div className="empty">No products published yet.</div>
        ) : (
          <div className="grid cards">
            {featured.map((p) => (
              <Link key={p.id} className="card" href={`/products/${p.slug}`} style={{ color: 'inherit' }}>
                <Placeholder kind="product" seed={p.id} tags={p.tags} label={p.title} size="md" />
                <h3>{p.title}</h3>
                <div className="desc">
                  {p.description ? (
                    <span dangerouslySetInnerHTML={{ __html: p.description.slice(0, 96) }} />
                  ) : (
                    '—'
                  )}
                </div>
                <div className="row">
                  <span className="price">₹{p.price}</span>
                  <span className="cat-pill">{p.tags?.[0] ?? 'item'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {categories.data.length > 0 && (
        <section className="container">
          <div className="section-head"><div><h2>Shop by category</h2></div></div>
          <div className="grid cards">
            {categories.data.map((c: any) => (
              <Link key={c.id} className="card" href={`/products?cat=${c.slug}`} style={{ color: 'inherit', alignItems: 'center', textAlign: 'center' }}>
                <Placeholder kind="category" seed={c.id} label={c.name} size="md" />
                <h3>{c.name}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container">
        <div className="section-head">
          <div><h2>From the blog</h2><p>Fresh articles on building software.</p></div>
          <Link className="btn ghost" href="/blog">All posts →</Link>
        </div>
        {latest.length === 0 ? (
          <div className="empty">No posts published yet.</div>
        ) : (
          <div className="grid cards">
            {latest.map((p) => (
              <Link key={p.id} className="post" href={`/blog/${p.slug}`} style={{ color: 'inherit' }}>
                <Placeholder kind="blog" seed={p.id} tags={p.tags} label={p.title} size="md" />
                <h3>{p.title}</h3>
                <div className="meta">{p.tags?.join(' · ') || 'article'}</div>
                <div className="excerpt">
                  {p.body ? (
                    <span dangerouslySetInnerHTML={{ __html: p.body.slice(0, 120) }} />
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
