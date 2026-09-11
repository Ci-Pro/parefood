'use client';

import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/app-shell';
import { Card, Stat, fmtIDR, StatusBadge } from '@/components/ui';
import { get } from '@/lib/api';

interface Dashboard {
  orders_today: number;
  merchants_pending: number;
  drivers_active: number;
  revenue: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<{ dashboard: Dashboard }>('/admin/dashboard');
      setData(res.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <h1 className="page-title">Beranda</h1>
      {error ? <div className="error-text">{error}</div> : null}
      {loading ? <div className="muted">Memuat dashboard...</div> : null}
      <div className="grid">
        <Stat label="Pesanan Hari Ini" value={data?.orders_today ?? 0} accent />
        <Stat label="Merchant Menunggu Validasi" value={data?.merchants_pending ?? 0} />
        <Stat label="Kurir Aktif" value={data?.drivers_active ?? 0} />
        <Stat label="Pendapatan (Selesai)" value={fmtIDR(data?.revenue ?? 0)} />
      </div>
      <Card title="Panel Operasional">
        <p className="small" style={{ color: 'var(--neutral-500)', margin: 0 }}>
          Gunakan menu Pesanan, Dispatch, Validasi, Bantuan, dan Laporan untuk mengelola
          operasional PareFood. Semua tindakan staf tercatat di audit log.
        </p>
      </Card>
      <Card title="Status Pesanan Terbaru (Panduan Badge)">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['PAID', 'WAITING_MERCHANT', 'READY_FOR_PICKUP', 'ON_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED_BY_ADMIN'].map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Card>
    </AppShell>
  );
}