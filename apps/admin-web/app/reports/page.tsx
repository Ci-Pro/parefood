'use client';

import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/app-shell';
import { Card, Row, Badge, fmtIDR, fmtDateTime } from '@/components/ui';
import { get } from '@/lib/api';

interface Report {
  period_start: string;
  period_end: string;
  total_orders: number;
  gmv: number;
  platform_revenue: number;
  driver_paid: number;
  merchant_paid: number;
}

interface TopMerchant {
  merchant_id: string;
  name: string | null;
  total: number;
}

interface AuditItem {
  id: string;
  actor_role?: string;
  entity_type?: string;
  action?: string;
  created_at?: string;
}

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<Report | null>(null);
  const [top, setTop] = useState<TopMerchant[]>([]);
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rep, audit] = await Promise.all([
        get<{ report: Report; top_merchants: TopMerchant[] }>('/admin/reports', { from, to }),
        get<{ logs: AuditItem[] }>('/admin/audit-logs'),
      ]);
      setReport(rep.report);
      setTop(rep.top_merchants || []);
      setLogs(audit.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const avg = report && report.total_orders > 0 ? Number(report.gmv) / report.total_orders : 0;

  return (
    <AppShell>
      <h1 className="page-title">Laporan</h1>
      <Card>
        <div className="grid">
          <div style={{ flex: 1 }}>
            <label>Dari (YYYY-MM-DD)</label>
            <input value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Sampai (YYYY-MM-DD)</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" disabled={loading} onClick={() => void load()}>
          {loading ? 'Menghitung...' : 'Tampilkan'}
        </button>
      </Card>
      {error ? <div className="error-text">{error}</div> : null}

      {report ? (
        <>
          <div className="grid">
            <Card title="Periode">
              <Row label="Dari" value={from} />
              <Row label="Sampai" value={to} />
            </Card>
            <Card title="Ringkasan">
              <Row label="Total Pesanan Selesai" value={String(report.total_orders)} />
              <Row label="GMV (Gross)" value={fmtIDR(report.gmv)} />
              <Row label="Rataan / Pesanan" value={fmtIDR(Math.round(avg))} />
              <Row label="Revenue Platform" value={fmtIDR(report.platform_revenue)} />
              <Row label="Kurir (PAID)" value={fmtIDR(report.driver_paid)} />
              <Row label="Merchant (PAID)" value={fmtIDR(report.merchant_paid)} />
            </Card>
          </div>

          <Card title="Top 5 Merchant">
            {top.length === 0 ? (
              <div className="muted">Belum ada data.</div>
            ) : (
              <table>
                <thead>
                  <tr><th>#</th><th>Merchant</th><th>GMV</th></tr>
                </thead>
                <tbody>
                  {top.map((m, i) => (
                    <tr key={m.merchant_id}>
                      <td>{i + 1}</td>
                      <td>{m.name || m.merchant_id}</td>
                      <td>{fmtIDR(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      ) : null}

      <Card title="Aktivitas Terakhir (Audit Log)">
        {logs.length === 0 ? (
          <div className="muted">Belum ada aktivitas tercatat.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Action</th><th>Entitas</th><th>Role</th><th>Waktu</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td><Badge label={l.action || '-'} variant="neutral" /></td>
                  <td>{l.entity_type || '-'}</td>
                  <td>{l.actor_role || '-'}</td>
                  <td className="muted small">{fmtDateTime(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </AppShell>
  );
}