import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, Price, Badge, LoadingIndicator, ErrorState, EmptyState } from '@parefood/design-system/react-native';
import { brand, colors, spacing, radius } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

interface Summary {
  gross: number;
  net: number;
  pending: number;
  cleared: number;
  paid: number;
}

interface EarningsRow {
  id: string;
  order_id: string;
  order_number?: string | null;
  gross_amount: number;
  adjustments: number;
  net_amount: number;
  status: string;
  created_at: string;
}

interface Settlement {
  id: string;
  settlement_number: string;
  period_start?: string | null;
  period_end?: string | null;
  gross: number;
  adjustments: number;
  fees: number;
  net: number;
  status: string;
  created_at: string;
}

const earningStatus: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
  PENDING: { label: 'Menunggu', variant: 'warning' },
  CLEARED: { label: 'Dihitung', variant: 'info' },
  PAID: { label: 'Dibayar', variant: 'success' },
};

const settlementStatus: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' | 'danger' }> = {
  PENDING: { label: 'Menunggu', variant: 'warning' },
  APPROVED: { label: 'Disetujui', variant: 'info' },
  PAID: { label: 'Dibayar', variant: 'success' },
  CANCELLED: { label: 'Dibatalkan', variant: 'danger' },
};

export default function FinanceScreen() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance'],
    queryFn: async () => {
      const api = getApiClient();
      return api.get<{ summary: Summary; earnings: EarningsRow[] }>('/my/merchant/finance');
    },
  });

  const { data: settlements } = useQuery({
    queryKey: ['settlements'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ settlements: Settlement[] }>('/my/merchant/settlements');
      return res.settlements;
    },
  });

  if (isLoading) return <LoadingIndicator label="Memuat keuangan..." />;
  if (isError || !data)
    return <ErrorState message="Gagal memuat keuangan" onRetry={() => refetch()} />;

  const { summary, earnings } = data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary */}
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Pendapatan</Text>
        <Price amount={summary.net} size="title" color={brand.primary} />
        <View style={styles.chips}>
          <Chip cash={summary.pending} label="Menunggu" color={colors.warning.DEFAULT} />
          <Chip cash={summary.cleared} label="Dihitung" color={colors.info.DEFAULT} />
          <Chip cash={summary.paid} label="Dibayar" color={colors.success.DEFAULT} />
        </View>
      </Card>

      {/* Recent earnings */}
      <Text style={styles.sectionTitle}>Pendapatan Terbaru</Text>
      {!earnings || earnings.length === 0 ? (
        <EmptyState title="Belum ada pendapatan" />
      ) : (
        earnings.map((e) => {
          const st = earningStatus[e.status] || earningStatus.PENDING;
          return (
            <Card key={e.id} style={styles.rowCard}>
              <View style={styles.rowHeader}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{e.order_number || 'Pesanan'}</Text>
                  <Text style={styles.rowDate}>
                    {new Date(e.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <Badge label={st.label} variant={st.variant} small />
              </View>
              <View style={styles.rowFooter}>
                <Price amount={e.net_amount} size="body" />
              </View>
            </Card>
          );
        })
      )}

      {/* Settlements */}
      <Text style={styles.sectionTitle}>Penyelesaian Dana (Settlement)</Text>
      {!settlements || settlements.length === 0 ? (
        <EmptyState title="Belum ada settlement" />
      ) : (
        settlements.map((s) => {
          const st = settlementStatus[s.status] || settlementStatus.PENDING;
          return (
            <Card key={s.id} style={styles.rowCard}>
              <View style={styles.rowHeader}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{s.settlement_number}</Text>
                  <Text style={styles.rowDate}>
                    {s.period_start
                      ? `${new Date(s.period_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${new Date(s.period_end!).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : new Date(s.created_at).toLocaleDateString('id-ID')}
                  </Text>
                </View>
                <Badge label={st.label} variant={st.variant} small />
              </View>
              <View style={styles.rowFooter}>
                <Price amount={s.net} size="body" />
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

function Chip({ cash, label, color }: { cash: number; label: string; color: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={[styles.chipValue, { color }]}>Rp {cash.toLocaleString('id-ID')}</Text>
    </View>
  );
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
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  chipValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  rowCard: {
    marginBottom: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  rowDate: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: 2,
  },
  rowFooter: {
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
});