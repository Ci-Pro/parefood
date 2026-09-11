'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/app-shell';
import { StatusBadge, fmtDateTime } from '@/components/ui';
import { get } from '@/lib/api';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  user_id: string;
  message_count?: number;
  last_message_at?: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<{ tickets: Ticket[] }>('/admin/support/tickets');
      setTickets(res.tickets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat tiket');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <h1 className="page-title">Bantuan — Tiket</h1>
      {error ? <div className="error-text">{error}</div> : null}
      {loading ? <div className="muted">Memuat tiket...</div> : null}
      {!loading && tickets.length === 0 ? <div className="muted">Belum ada tiket bantuan.</div> : null}

      <table>
        <thead>
          <tr>
            <th>Subjek</th>
            <th>Status</th>
            <th>Pelapor</th>
            <th>Pesan</th>
            <th>Aktivitas Terakhir</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td>{t.subject}</td>
              <td><StatusBadge status={t.status} /></td>
              <td className="muted small">{t.user_id}</td>
              <td className="muted">{t.message_count ?? 0}</td>
              <td className="muted small">{fmtDateTime(t.last_message_at)}</td>
              <td><Link href={`/support/${t.id}`}>Buka</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppShell>
  );
}