// apps/webstore/app/dashboard/page.tsx
'use client';
import { getUser, logout } from '@/lib/auth';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export default function DashboardPage() {
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>Dashboard</h1>
        <div className="actions">
          <Link className="user" href="/dashboard">{user?.name || user?.email}</Link>
          <LogoutButton />
        </div>
      </header>
      <section className="grid">
        <Link className="card" href="/dashboard/purchases">
          <span className="icon">🛒</span>
          <h3>My Purchases</h3>
          <p>View and download your orders</p>
        </Link>
        <Link className="card" href="/dashboard/support">
          <span className="icon">🎫</span>
          <h3>Support Tickets</h3>
          <p>Create and track tickets</p>
        </Link>
        <Link className="card" href="/dashboard/profile">
          <span className="icon">👤</span>
          <h3>Profile</h3>
          <p>Manage your account</p>
        </Link>
      </section>
    </div>
  );
}