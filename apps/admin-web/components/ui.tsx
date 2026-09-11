'use client';

import React from 'react';

export function Card({ children, title }: { children?: React.ReactNode; title?: string }) {
  return (
    <div className="card">
      {title ? <h3>{title}</h3> : null}
      {children}
    </div>
  );
}

export function Badge({ label, variant = 'neutral' }: { label: string; variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) {
  return <span className={`badge badge-${variant}`}>{label}</span>;
}

const STATUS_VARIANT: Record<string, string> = {
  PENDING_PAYMENT: 'warning',
  PAID: 'info',
  WAITING_MERCHANT: 'warning',
  MERCHANT_ACCEPTED: 'info',
  PREPARING: 'warning',
  READY_FOR_PICKUP: 'warning',
  DRIVER_ASSIGNED: 'info',
  DRIVER_PICKING_UP: 'info',
  PICKED_UP: 'info',
  ON_DELIVERY: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED_BY_CUSTOMER: 'danger',
  CANCELLED_BY_MERCHANT: 'danger',
  CANCELLED_BY_ADMIN: 'danger',
  REJECTED_BY_MERCHANT: 'danger',
  REFUND_PENDING: 'warning',
  REFUNDED: 'success',
  FAILED: 'danger',
  OPEN: 'warning',
  IN_PROGRESS: 'info',
  CLOSED: 'neutral',
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  ONLINE: 'success',
  OFFLINE: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Menunggu Pembayaran',
  PAID: 'Dibayar',
  WAITING_MERCHANT: 'Menunggu Merchant',
  MERCHANT_ACCEPTED: 'Diterima',
  PREPARING: 'Disiapkan',
  READY_FOR_PICKUP: 'Siap Diambil',
  DRIVER_ASSIGNED: 'Driver Ditugaskan',
  DRIVER_PICKING_UP: 'Menuju Merchant',
  PICKED_UP: 'Sedang Diantar',
  ON_DELIVERY: 'Dalam Perjalanan',
  DELIVERED: 'Terkirim',
  COMPLETED: 'Selesai',
  CANCELLED_BY_CUSTOMER: 'Dibatalkan',
  CANCELLED_BY_MERCHANT: 'Dibatalkan Merchant',
  CANCELLED_BY_ADMIN: 'Dibatalkan Admin',
  REJECTED_BY_MERCHANT: 'Ditolak Merchant',
  REFUND_PENDING: 'Refund Diproses',
  REFUNDED: 'Refund',
  FAILED: 'Gagal',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge label={STATUS_LABEL[status] || status} variant={(STATUS_VARIANT[status] as 'success' | 'warning' | 'danger' | 'info' | 'neutral') || 'neutral'} />;
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mut-row">
      <span className="muted small">{label}</span>
      <span className="small">{value}</span>
    </div>
  );
}

export function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="stat">
      <div className="value" style={accent ? undefined : { color: 'var(--neutral-900)' }}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" />;
}

export function fmtIDR(n: number | string | null | undefined) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

export function fmtDateTime(v?: string | null) {
  if (!v) return '-';
  try {
    return new Date(v).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return v;
  }
}

export function fmtTime(v?: string | null) {
  if (!v) return '-';
  try {
    return new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return v;
  }
}