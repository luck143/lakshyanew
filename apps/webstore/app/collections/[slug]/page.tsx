// apps/webstore/app/collections/[slug]/page.tsx
// Collection (category) detail: ISR. Lists the category's active products.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategory, listProducts, listCategories } from '@/lib/api';
import { Placeholder } from '@/components/Placeholder';

export const dynamic = 'force-static'; // ISR
export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const cats = await listCategories();
    return cats.data.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  let category;
  try {
    category = await getCategory(params.slug);
  } catch {
    notFound();
  }
  const products = await listProducts(category.id);
  return (
    <section className="container" style={{ padding: '48px 22px' }}>
      <div className="section-head">
        <div>
          <h2>{category.name}</h2>
          <p>{products.data.length} item{products.data.length === 1 ? '' : 's'}</p>
        </div>
      </div>
      {products.data.length === 0 ? (
        <div className="empty">No products in this collection yet.</div>
      ) : (
        <div className="grid cards">
          {products.data.map((p) => (
            <Link key={p.id} className="card" href={`/products/${p.slug}`} style={{ color: 'inherit' }}>
              <Placeholder kind="product" seed={p.id} tags={p.tags} label={p.title} size="md" />
              <h3>{p.title}</h3>
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
