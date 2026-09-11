import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, Price, LoadingIndicator, ErrorState, Badge, Button } from '@parefood/design-system/react-native';
import { brand, colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

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

export default function ReportsScreen() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [submitted, setSubmitted] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery<{
    report: Report;
    top_merchants: TopMerchant[];
  }>({
    queryKey: ['admin-reports', from, to, submitted],
    enabled: submitted > 0,
    queryFn: async () => {
      const api = getApiClient();
      return api.get<{ report: Report; top_merchants: TopMerchant[] }>('/admin/reports', { from, to });
    },
  });

  const audits = useQuery<{ logs: AuditItem[] }>({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const api = getApiClient();
      return api.get<{ logs: AuditItem[] }>('/admin/audit-logs');
    },
  });

  const r = data?.report;
  const avg = r && r.total_orders > 0 ? Number(r.gmv) / r.total_orders : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Laporan</Text>

      <View style={styles.filterCard}>
        <Text style={styles.label}>Dari (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={from}
          onChangeText={setFrom}
          placeholder="2026-01-01"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Sampai (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={to}
          onChangeText={setTo}
          placeholder="2026-01-31"
          autoCapitalize="none"
        />
        <Button label="Tampilkan" size="sm" onPress={() => setSubmitted((s) => s + 1)} />
      </View>

      {submitted > 0 && isLoading && <LoadingIndicator label="Menghitung laporan..." />}
      {submitted > 0 && isError && <ErrorState message="Gagal memuat laporan" onRetry={() => refetch()} />}

      {r ? (
        <>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>
              {from} → {to}
            </Text>
            <Row label="Total Pesanan Selesai" value={String(r.total_orders)} />
            <Row label="GMV (Gross)" value={formatIDR(r.gmv)} />
            <Row label="Rataan / Pesanan" value={formatIDR(Math.round(avg))} />
            <Row label="Revenue Platform" value={formatIDR(r.platform_revenue)} />
            <Row label="Pendapatan Kurir (PAID)" value={formatIDR(r.driver_paid)} />
            <Row label="Pendapatan Merchant (PAID)" value={formatIDR(r.merchant_paid)} />
          </Card>

          <Text style={styles.sectionTitle}>Top 5 Merchant</Text>
          {(data.top_merchants || []).length === 0 ? (
            <Text style={styles.dim}>Belum ada data.</Text>
          ) : (
            (data.top_merchants || []).map((m, i) => (
              <Card key={m.merchant_id} style={styles.card}>
                <View style={styles.topRow}>
                  <Text style={styles.rank}>#{i + 1}</Text>
                  <Text style={styles.merchantName}>{m.name || m.merchant_id}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.dim}>{m.merchant_id.slice(0, 8)}…</Text>
                  <Price amount={Number(m.total)} size="caption" color={brand.primary} />
                </View>
              </Card>
            ))
          )}
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Aktivitas Terakhir</Text>
      {audits.isLoading ? (
        <LoadingIndicator label="Memuat audit log..." />
      ) : audits.isError ? (
        <ErrorState message="Gagal memuat audit log" onRetry={() => audits.refetch()} />
      ) : (audits.data?.logs || []).length === 0 ? (
        <Text style={styles.dim}>Belum ada aktivitas tercatat.</Text>
      ) : (
        (audits.data?.logs || []).map((log) => (
          <View key={log.id} style={styles.auditRow}>
            <Badge label={log.action || '-'} small variant="neutral" />
            <View style={styles.auditInfo}>
              <Text style={styles.auditText}>
                {log.entity_type || '-'} · {log.actor_role || '-'}
              </Text>
              <Text style={styles.dim}>
                {log.created_at
                  ? new Date(log.created_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function formatIDR(n: number) {
  return 'Rp ' + (Number(n || 0)).toLocaleString('id-ID');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  content: {
    padding: spacing.md,
    paddingBottom: 48,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    color: colors.neutral[600],
    marginBottom: 4,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    marginBottom: spacing.sm,
    fontSize: 14,
  },
  card: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 14,
    color: colors.neutral[900],
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rank: {
    fontSize: 14,
    fontWeight: '800',
    color: brand.primary,
    marginRight: spacing.sm,
  },
  merchantName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  auditInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  auditText: {
    fontSize: 13,
    color: colors.neutral[700],
  },
  dim: {
    fontSize: 12,
    color: colors.neutral[400],
  },
});