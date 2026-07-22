// apps/webstore/components/LogoutButton.tsx
'use client';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await logout();
        router.push('/');
        router.refresh();
      }}
      className="btn ghost"
    >
      Logout
    </button>
  );
}