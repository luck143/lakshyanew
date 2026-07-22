// apps/webstore/app/dashboard/layout.tsx
'use client';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    getUser().then((user) => {
      if (!user) {
        router.push('/login');
      }
    });
  }, [router]);

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="brand">
          <Link href="/dashboard">Lakshya</Link>
        </div>
        <nav className="nav">
          <Link href="/dashboard" className="nav-item">
            <span className="icon">📊</span>
            <span>Overview</span>
          </Link>
          <Link href="/dashboard/purchases" className="nav-item">
            <span className="icon">🛒</span>
            <span>Purchases</span>
          </Link>
          <Link href="/dashboard/support" className="nav-item">
            <span className="icon">🎫</span>
            <span>Support</span>
          </Link>
          <Link href="/dashboard/profile" className="nav-item">
            <span className="icon">👤</span>
            <span>Profile</span>
          </Link>
        </nav>
      </aside>
      <main className="content">
        {children}
      </main>
    </div>
  );
}