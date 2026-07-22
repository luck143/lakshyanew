// apps/webstore/app/checkout/page.tsx
// Checkout: Server-rendered. Reads the lakshya_cart cookie and shows the order summary + Place order.
import Link from 'next/link';
import { getCartId, fetchCart } from '@/lib/cart';
import PlaceOrder from './PlaceOrder';

export const dynamic = 'force-dynamic'; // SSR

export default async function CheckoutPage() {
  const cartId = getCartId();
  const cart = cartId ? await fetchCart(cartId) : null;
  const items = cart?.items ?? [];
  const total = items.reduce((s: number, it: any) => s + (it.price || 0) * it.qty, 0);

  if (items.length === 0) {
    return (
      <section>
        <h1>Checkout</h1>
        <p>Your cart is empty. <Link href="/products">Browse products</Link>.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Checkout</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((it: any) => (
          <li key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span>{it.product?.title ?? it.productId} × {it.qty}</span>
            <span>₹{(it.price || 0) * it.qty}</span>
          </li>
        ))}
      </ul>
      <div style={{ textAlign: 'right', fontWeight: 700, marginTop: 12 }}>Total: ₹{total}</div>
      <div style={{ marginTop: 16 }}>
        <PlaceOrder cartId={cartId!} />
      </div>
    </section>
  );
}
