// apps/webstore/app/cart/page.tsx
// Cart: Server-rendered. Reads the lakshya_cart cookie and shows the guest cart's items.
import Link from 'next/link';
import { getCartId, fetchCart } from '@/lib/cart';

export const dynamic = 'force-dynamic'; // SSR (cart is per-visitor, never cached)

export default async function CartPage() {
  const cartId = getCartId();
  const cart = cartId ? await fetchCart(cartId) : null;
  const items = cart?.items ?? [];
  const total = items.reduce((s: number, it: any) => s + (it.price || 0) * it.qty, 0);
  return (
    <div className="container">
      <h1 className="section-title">Your cart</h1>
      {items.length === 0 ? (
        <p className="notice">Your cart is empty. <Link href="/products">Browse products →</Link></p>
      ) : (
        <div className="card" style={{ padding: 8 }}>
          {items.map((it: any) => (
            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <span>{it.product?.title ?? it.productId} <span className="muted">× {it.qty}</span></span>
              <span style={{ fontWeight: 700 }}>₹{(it.price || 0) * it.qty}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
            <span className="price-lg">Total: ₹{total}</span>
            <Link className="btn" href="/checkout">Checkout</Link>
          </div>
        </div>
      )}
    </div>
  );
}
