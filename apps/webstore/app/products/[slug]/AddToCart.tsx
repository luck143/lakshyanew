// apps/webstore/app/products/[slug]/AddToCart.tsx
// Client component: ensures a cart exists (cookie), adds the product, navigates to /cart.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddToCart({ productId }: { productId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function add() {
    setBusy(true);
    try {
      // get or create cart
      let cartId = document.cookie.split('; ').find((c) => c.startsWith('lakshya_cart='))?.split('=')[1];
      if (!cartId) {
        const c = await fetch('/api/cart', { method: 'POST' });
        cartId = (await c.json()).data?.id;
      }
      const r = await fetch(`/api/cart/${cartId}/items`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId, qty: 1 }),
      });
      if (r.ok) router.push('/cart');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={add} disabled={busy} style={{ marginTop: 16, padding: '10px 18px', background: '#111', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
      {busy ? 'Adding…' : 'Add to cart'}
    </button>
  );
}
