// apps/webstore/app/collections/[slug]/page.tsx
// Collection (category) detail: ISR. Lists the category's active products.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategory, listProducts, listCategories } from '@/lib/api';

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
    <section>
      <h1>{category.name}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {products.data.map((p) => (
          <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
            <Link href={`/products/${p.slug}`} style={{ fontWeight: 600, color: '#111', textDecoration: 'none' }}>{p.title}</Link>
            <div>₹{p.price}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
