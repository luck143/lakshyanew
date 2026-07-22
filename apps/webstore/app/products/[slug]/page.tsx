// apps/webstore/app/products/[slug]/page.tsx
// Product detail: Server-rendered on demand.
import { getProduct, listProducts } from '@/lib/api';
import { notFound } from 'next/navigation';
import AddToCart from './AddToCart';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  try {
    const products = await listProducts();
    return products.data.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  let product;
  try {
    product = await getProduct(params.slug);
  } catch {
    notFound();
  }
  const norm = (v?: string) => v ? v.replace(/<\/?[\w\s="-]+>/gi, ' ').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\s+/g,' ').trim() : '';
  return (
    <div className="container">
      <div className="pdp">
        <div className="gallery">📘</div>
        <div>
          <h1>{product.title}</h1>
          <div className="price">₹{product.price}</div>
          <div className="meta-row">
            <span>SKU: <b>{product.sku ?? '—'}</b></span>
            <span>Stock: <b>{product.stock ?? 0}</b></span>
            {product.tags?.length ? <span>{product.tags.map((t: string) => <span key={t} className="tag">{t}</span>)}</span> : null}
          </div>
          {product.description ? (
            <div className="desc">{norm(product.description)}</div>
          ) : null}
          <AddToCart productId={product.id} />
        </div>
      </div>
    </div>
  );
}
