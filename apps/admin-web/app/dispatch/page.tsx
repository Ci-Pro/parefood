'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/app-shell';
import { StatusBadge, fmtTime } from '@/components/ui';
import { get } from '@/lib/api';

interface DispatchOrder {
  id: string;
  order_number: string;
  status: string;
  delivery_address?: string;
  created_at: string;
  delivery?: { driver_id: string; status: string } | null;
}

export default function DispatchPage() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<{ orders: DispatchOrder[] }>('/admin/dispatch');
      setOrders(res.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data dispatch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <div className="row">
        <h1 className="page-title">Dispatch</h1>
        <button className="btn btn-outline" onClick={() => void load()}>Muat Ulang</button>
      </div>
      {error ? <div className="error-text">{error}</div> : null}
      {loading ? <div className="muted">Memuat operasional...</div> : null}
      {!loading && orders.length === 0 ? <div className="muted">Tidak ada pesanan dalam proses.</div> : null}

      {orders.map((o) => (
        <div key={o.id} className="list-item">
          <div className="row">
            <span className="title">{o.order_number}</span>
            <StatusBadge status={o.status} />
          </div>
          <div className="muted small" style={{ marginTop: 4 }}>
            Alamat: {o.delivery_address || '-'}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="muted small">{fmtTime(o.created_at)}</span>
            {o.delivery && o.delivery.driver_id ? (
              <span className="muted small">🛵 {o.delivery.driver_id.slice(0, 8)} · {o.delivery.status}</span>
            ) : (
              <Link href={`/orders/${o.id}`}>Lihat detail</Link>
            )}
          </div>
        </div>
      ))}
    </AppShell>
  );
}