// apps/webstore/components/AuthHeader.tsx
'use client';
import { useEffect, useState } from 'react';
import { getUser, logout } from '@/lib/auth';
import Link from 'next/link';
import LogoutButton from './LogoutButton';

export default function AuthHeader() {
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="auth"><span className="loading">...</span><Link className="cart" href="/cart">Cart</Link></div>;

  return (
    <div className="auth">
      {user ? (
        <>
          <Link className="user" href="/dashboard">
            {user.name || user.email}
          </Link>
          <LogoutButton />
        </>
      ) : (
        <Link className="btn ghost" href="/login">
          Login
        </Link>
      )}
      <Link className="cart" href="/cart">Cart</Link>
    </div>
  );
}