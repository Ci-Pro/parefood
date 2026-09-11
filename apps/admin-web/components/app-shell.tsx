'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, clearSession, isAdminRole } from '@/lib/session';

const NAV = [
  { href: '/', label: '🏠 Dashboard' },
  { href: '/orders', label: '🧾 Pesanan' },
  { href: '/dispatch', label: '🛵 Dispatch' },
  { href: '/validation', label: '✅ Validasi' },
  { href: '/support', label: '🎧 Bantuan' },
  { href: '/reports', label: '📊 Laporan' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const session = getSession();

  useEffect(() => {
    if (!session || !isAdminRole(session.role)) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [session, router]);

  if (!ready || !session || !isAdminRole(session.role)) return null;

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">PareFood Admin</div>
        <nav>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button className="logout" onClick={handleLogout}>
          Keluar ({session.name || session.email})
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}