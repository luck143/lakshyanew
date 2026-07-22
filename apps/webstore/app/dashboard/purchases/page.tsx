// apps/webstore/app/dashboard/purchases/page.tsx
'use client';
import { getUser } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE || 'http://localhost:3001';

type Order = {
  id: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  title?: string | null;
};

export default function PurchasesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const user = await getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/public/orders?filters=${encodeURIComponent(JSON.stringify({ userId: user.uid }))}`, {
          credentials: 'include',
        });
        // Prefer authenticated self-scoped endpoint if present; fall back to empty list
        if (!res.ok) {
          setOrders([]);
          setLoading(false);
          return;
        }
        const json = await res.json();
        const rows = json?.data?.items ?? json?.data ?? [];
        setOrders(Array.isArray(rows) ? rows : []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load purchases');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <div className="loading">Loading purchases…</div>;

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>My Purchases</h1>
      </header>
      {error && <div className="error">{error}</div>}
      {orders.length === 0 ? (
        <div className="empty-state">
          <p>No purchases yet.</p>
          <a className="btn" href="/products">Browse shop</a>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.title || o.id.slice(0, 8)}</td>
                  <td><span className={`badge status-${o.status}`}>{o.status}</span></td>
                  <td>{o.currency} {Number(o.total).toFixed(2)}</td>
                  <td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}