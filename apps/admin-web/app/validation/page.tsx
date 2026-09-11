'use client';

import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/app-shell';
import { Badge, fmtDateTime } from '@/components/ui';
import { get, post } from '@/lib/api';

interface PendingMerchant {
  id: string;
  name: string;
  status: string;
  owner_id: string;
  created_at?: string;
}

interface PendingDriver {
  id: string;
  name?: string;
  status?: string;
  created_at?: string;
}

type Tab = 'merchants' | 'drivers';

export default function ValidationPage() {
  const [tab, setTab] = useState<Tab>('merchants');
  const [merchants, setMerchants] = useState<PendingMerchant[]>([]);
  const [drivers, setDrivers] = useState<PendingDriver[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [m, d] = await Promise.all([
        get<{ merchants: PendingMerchant[] }>('/admin/merchants/pending'),
        get<{ drivers: PendingDriver[] }>('/admin/drivers/pending'),
      ]);
      setMerchants(m.merchants || []);
      setDrivers(d.drivers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data validasi');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (route: string, id: string, action: 'approve' | 'reject', label: string) => {
    if (!window.confirm(`${action === 'approve' ? 'Setujui' : 'Tolak'} ${label}?`)) return;
    setBusy(true);
    setError('');
    try {
      await post(`/admin/${route}/${id}/${action}`, {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <h1 className="page-title">Validasi</h1>
      <div className="chips">
        <button className={`chip ${tab === 'merchants' ? 'active' : ''}`} onClick={() => setTab('merchants')}>
          Merchant ({merchants.length})
        </button>
        <button className={`chip ${tab === 'drivers' ? 'active' : ''}`} onClick={() => setTab('drivers')}>
          Kurir ({drivers.length})
        </button>
      </div>
      {error ? <div className="error-text">{error}</div> : null}

      {tab === 'merchants' ? (
        merchants.length === 0 ? (
          <div className="muted">Tidak ada merchant menunggu validasi.</div>
        ) : (
          merchants.map((m) => (
            <div key={m.id} className="list-item">
              <div className="row">
                <span className="title">{m.name}</span>
                <Badge label={m.status} variant="warning" />
              </div>
              <div className="muted small" style={{ margin: '4px 0 8px' }}>
                Owner: {m.owner_id} · Dibuat: {fmtDateTime(m.created_at)}
              </div>
              <button className="btn btn-primary" disabled={busy} onClick={() => decide('merchants', m.id, 'approve', m.name)}>
                Setujui
              </button>{' '}
              <button className="btn btn-danger" disabled={busy} onClick={() => decide('merchants', m.id, 'reject', m.name)}>
                Tolak
              </button>
            </div>
          ))
        )
      ) : drivers.length === 0 ? (
        <div className="muted">Tidak ada kurir menunggu validasi.</div>
      ) : (
        drivers.map((d) => (
          <div key={d.id} className="list-item">
            <div className="row">
              <span className="title">{d.name || d.id}</span>
              <Badge label={d.status || '-'} variant="warning" />
            </div>
            <div className="muted small" style={{ margin: '4px 0 8px' }}>Dibuat: {fmtDateTime(d.created_at)}</div>
            <button className="btn btn-primary" disabled={busy} onClick={() => decide('drivers', d.id, 'approve', d.name || d.id)}>
              Setujui
            </button>{' '}
            <button className="btn btn-danger" disabled={busy} onClick={() => decide('drivers', d.id, 'reject', d.name || d.id)}>
              Tolak
            </button>
          </div>
        ))
      )}
    </AppShell>
  );
}