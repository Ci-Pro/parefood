'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/app-shell';
import { Card, Row, StatusBadge, Badge, fmtIDR, fmtDateTime } from '@/components/ui';
import { get, post } from '@/lib/api';

interface OrderDetail {
  order: {
    id: string;
    order_number: string;
    status: string;
    payment_status?: string;
    payment_method?: string;
    subtotal: number;
    discount: number;
    delivery_fee: number;
    service_fee: number;
    tax: number;
    grand_total: number;
    delivery_address?: string | null;
    created_at: string;
    delivery?: { driver_id: string; status: string } | null;
    items: { id: string; name?: string; quantity: number; unit_price: number; notes?: string }[];
    status_history?: { to_status: string; actor_role?: string; reason?: string; created_at: string }[];
  };
}

const CANCELLABLE = [
  'PENDING_PAYMENT', 'PAID', 'WAITING_MERCHANT', 'MERCHANT_ACCEPTED',
  'PREPARING', 'READY_FOR_PICKUP', 'DRIVER_ASSIGNED', 'PICKED_UP', 'ON_DELIVERY',
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = String(params.id);
  const [data, setData] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await get<OrderDetail>(`/admin/orders/${orderId}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan');
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = async () => {
    if (!data) return;
    if (!window.confirm(`Batalkan ${data.order.order_number}?`)) return;
    setBusy(true);
    setError('');
    try {
      await post(`/admin/orders/${orderId}/cancel`, { reason: 'Dibatalkan oleh admin (web)' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membatalkan');
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <AppShell><div className="error-text">{error}</div></AppShell>;
  if (!data) return <AppShell><div className="muted">Memuat pesanan...</div></AppShell>;

  const o = data.order;
  const cancellable = CANCELLABLE.includes(o.status);

  return (
    <AppShell>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>{o.order_number}</h1>
        <StatusBadge status={o.status} />
      </div>
      {error ? <div className="error-text">{error}</div> : null}

      <div className="grid">
        <Card title="Info Pesanan" >
          <Row label="Dibuat" value={fmtDateTime(o.created_at)} />
          <Row label="Alamat" value={o.delivery_address || '-'} />
          <Row label="Pembayaran" value={o.payment_method || '-'} />
          <Row label="Status Bayar" value={o.payment_status || '-'} />
        </Card>
        <Card title="Item">
          {(o.items || []).map((it) => (
            <div key={it.id} className="mut-row">
              <span className="small">{it.name || 'Item'} × {it.quantity}</span>
              <span className="small">{fmtIDR(it.unit_price * it.quantity)}</span>
            </div>
          ))}
        </Card>
      </div>

      <Card title="Ringkasan Pembayaran">
        <Row label="Subtotal" value={fmtIDR(o.subtotal)} />
        <Row label="Diskon" value={fmtIDR(o.discount)} />
        <Row label="Biaya Antar" value={fmtIDR(o.delivery_fee)} />
        <Row label="Biaya Layanan" value={fmtIDR(o.service_fee)} />
        <div className="mut-row">
          <strong className="small">Total</strong>
          <strong className="small">{fmtIDR(o.grand_total)}</strong>
        </div>
      </Card>

      {o.delivery ? (
        <Card title="Pengiriman">
          <Row label="Kurir ID" value={o.delivery.driver_id} />
          <Row label="Status" value={o.delivery.status} />
        </Card>
      ) : null}

      {(o.status_history || []).length > 0 ? (
        <Card title="Riwayat Status">
          {(o.status_history || []).map((h, i) => (
            <div key={i} className="mut-row">
              <Badge label={h.to_status} variant="neutral" />
              <span className="muted small">
                {h.actor_role || '-'} · {fmtDateTime(h.created_at)}
              </span>
            </div>
          ))}
        </Card>
      ) : null}

      {cancellable ? (
        <button className="btn btn-danger" onClick={handleCancel} disabled={busy}>
          {busy ? 'Memproses...' : 'Batalkan Pesanan'}
        </button>
      ) : null}

      <button className="btn btn-outline" onClick={() => router.push('/orders')} style={{ marginLeft: 8 }}>
        Kembali
      </button>
    </AppShell>
  );
}