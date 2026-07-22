// apps/webstore/app/checkout/PlaceOrder.tsx
// Client component: places the order from the current cart, then pays it, and shows confirmation.
'use client';
import { useState } from 'react';

export default function PlaceOrder({ cartId }: { cartId: string }) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<'idle' | 'placed' | 'paid'>('idle');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function place() {
    setBusy(true);
    setErr(null);
    try {
      const co = await fetch(`/api/cart/${cartId}/checkout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      const cj = await co.json();
      if (!co.ok) { setErr(cj.message || 'Checkout failed'); return; }
      const oid = cj.data?.id;
      setOrderId(oid);
      setState('placed');
      // pay (mock gateway by default; swap via PAYMENT_GATEWAY env)
      const pay = await fetch(`/api/orders/${oid}/pay`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      const pj = await pay.json();
      if (pay.ok) setState('paid');
      else setErr(pj.message || 'Payment failed');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (state !== 'idle') {
    return (
      <div style={{ padding: 16, border: `1px solid ${state === 'paid' ? '#0a0' : '#999'}`, borderRadius: 8 }}>
        <h2>{state === 'paid' ? 'Order paid 🎉' : 'Order placed'}</h2>
        <p>Order ID: <code>{orderId}</code></p>
        <p>{state === 'paid' ? 'Payment captured (mock gateway).' : 'Awaiting payment.'}</p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={place} disabled={busy} style={{ padding: '10px 18px', background: '#111', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
        {busy ? 'Placing…' : 'Place order & pay'}
      </button>
      {err ? <p style={{ color: 'red' }}>{err}</p> : null}
    </div>
  );
}
