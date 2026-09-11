'use client';

import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/app-shell';
import { Badge, fmtDateTime } from '@/components/ui';
import { get } from '@/lib/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}

const ROLE_FILTERS = [
  { key: '', label: 'Semua' },
  { key: 'customer', label: 'Customer' },
  { key: 'driver', label: 'Driver' },
  { key: 'merchant_owner', label: 'Merchant' },
  { key: 'admin_operations', label: 'Admin' },
];

export default function UsersPage() {
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (roleKey: string, query: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await get<{ users: AdminUser[] }>('/admin/users', {
        role: roleKey,
        search: query || undefined,
        size: 100,
      });
      setUsers(res.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengguna');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(role, search);
  }, [role, search, load]);

  return (
    <AppShell>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Pengguna</h1>
        <input
          style={{ width: 260, margin: 0 }}
          placeholder="Cari nama..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="chips">
        {ROLE_FILTERS.map((f) => (
          <button key={f.key || 'all'} className={`chip ${role === f.key ? 'active' : ''}`} onClick={() => setRole(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      {error ? <div className="error-text">{error}</div> : null}
      {loading ? <div className="muted">Memuat pengguna...</div> : null}
      {!loading && users.length === 0 ? <div className="muted">Tidak ada pengguna.</div> : null}

      <table>
        <thead>
          <tr>
            <th>Nama</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Daftar</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td className="muted">{u.email}</td>
              <td><Badge label={u.role} variant="neutral" /></td>
              <td><Badge label="Aktif" variant={u.is_active ? 'success' : 'danger'} /></td>
              <td className="muted small">{fmtDateTime(u.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppShell>
  );
}