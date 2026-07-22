// apps/webstore/app/dashboard/profile/page.tsx
'use client';
import { getUser, type AuthUser } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser().then((u) => {
      if (!u) router.push('/login');
      else {
        setUser(u);
        setLoading(false);
      }
    });
  }, [router]);

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>Profile</h1>
        <LogoutButton />
      </header>
      <div className="profile-card">
        <div className="row"><span className="label">Name</span><span>{user?.name || '—'}</span></div>
        <div className="row"><span className="label">Email</span><span>{user?.email}</span></div>
        <div className="row"><span className="label">Role</span><span>{user?.role || 'user'}</span></div>
        <div className="row"><span className="label">User ID</span><span className="mono">{user?.uid}</span></div>
      </div>
    </div>
  );
}