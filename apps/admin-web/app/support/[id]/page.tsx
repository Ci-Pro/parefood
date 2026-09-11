'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/app-shell';
import { Card, StatusBadge, fmtDateTime } from '@/components/ui';
import { get, post } from '@/lib/api';

interface TicketDetail {
  ticket: {
    id: string;
    subject: string;
    status: string;
    user_id: string;
    messages: {
      id: string;
      message: string;
      is_from_support?: boolean;
      user_id?: string;
      created_at?: string;
    }[];
  };
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = String(params.id);
  const [data, setData] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await get<TicketDetail>(`/admin/support/tickets/${ticketId}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat tiket');
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    setError('');
    try {
      await post(`/admin/support/tickets/${ticketId}/reply`, { message: reply.trim() });
      setReply('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim balasan');
    } finally {
      setBusy(false);
    }
  };

  const closeTicket = async () => {
    if (!window.confirm('Tutup tiket ini?')) return;
    setBusy(true);
    setError('');
    try {
      await post(`/admin/support/tickets/${ticketId}/close`, {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menutup tiket');
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <AppShell><div className="error-text">{error}</div></AppShell>;
  if (!data) return <AppShell><div className="muted">Memuat tiket...</div></AppShell>;

  const t = data.ticket;
  const closed = t.status === 'CLOSED';

  return (
    <AppShell>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>{t.subject}</h1>
        <StatusBadge status={t.status} />
      </div>
      <div className="muted small" style={{ marginBottom: 12 }}>Pelapor: {t.user_id}</div>
      {error ? <div className="error-text">{error}</div> : null}

      {(t.messages || []).map((m) => (
        <div key={m.id} className="list-item" style={m.is_from_support ? { borderLeft: '4px solid var(--primary)' } : undefined}>
          <div className="small">{m.message}</div>
          <div className="muted small" style={{ marginTop: 4 }}>
            {m.is_from_support ? 'Admin' : 'Pelapor'} · {fmtDateTime(m.created_at)}
          </div>
        </div>
      ))}

      {closed ? (
        <Card title="Tiket Ditutup">Tiket ini sudah ditutup.</Card>
      ) : (
        <Card title="Balas">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Tulis balasan..."
            rows={4}
          />
          <button className="btn btn-primary" disabled={busy || !reply.trim()} onClick={sendReply}>
            {busy ? 'Mengirim...' : 'Kirim Balasan'}
          </button>{' '}
          <button className="btn btn-danger" disabled={busy} onClick={closeTicket}>
            Tutup Tiket
          </button>
        </Card>
      )}

      <button className="btn btn-outline" onClick={() => router.push('/support')}>Kembali</button>
    </AppShell>
  );
}