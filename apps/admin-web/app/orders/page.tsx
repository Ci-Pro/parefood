'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/app-shell';
import { StatusBadge, fmtIDR, fmtDateTime } from '@/components/ui';
import { get } from '@/lib/api';

interface AdminOrder {
  id: string;
  order_number: string;
  status: string;
  grand_total: number;
  payment_method?: string;
  created_at: string;
}

const FILTERS = [
  { key: '', label: 'Semua' },
  { key: 'PAID', label: 'Dibayar' },
  { key: 'WAITING_MERCHANT', label: 'Menunggu Merchant' },
  { key: 'READY_FOR_PICKUP', label: 'Siap Diambil' },
  { key: 'DELIVERED', label: 'Terkirim' },
  { key: 'COMPLETED', label: 'Selesai' },
];

export default function OrdersPage() {
  const [status, setStatus] = useState('');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (filter: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await get<{ orders: AdminOrder[] }>('/admin/orders', { status: filter, size: 100 });
      setOrders(res.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(status);
  }, [status, load]);

  return (
    <AppShell>
      <h1 className="page-title">Pesanan</h1>
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.key || 'all'} className={`chip ${status === f.key ? 'active' : ''}`} onClick={() => setStatus(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      {error ? <div className="error-text">{error}</div> : null}
      {loading ? <div className="muted">Memuat pesanan...</div> : null}
      {!loading && orders.length === 0 ? <div className="muted">Tidak ada pesanan.</div> : null}
      <table>
        <thead>
          <tr>
            <th>Nomor</th>
            <th>Status</th>
            <th>Total</th>
            <th>Pembayaran</th>
            <th>Dibuat</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.order_number}</td>
              <td><StatusBadge status={o.status} /></td>
              <td>{fmtIDR(o.grand_total)}</td>
              <td className="muted">{o.payment_method || '-'}</td>
              <td className="muted">{fmtDateTime(o.created_at)}</td>
              <td><Link href={`/orders/${o.id}`}>Detail</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppShell>
  );
}