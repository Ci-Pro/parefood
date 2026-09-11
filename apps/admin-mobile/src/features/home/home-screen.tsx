import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, Price, LoadingIndicator, ErrorState } from '@parefood/design-system/react-native';
import { brand, colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

interface Dashboard {
  orders_today: number;
  merchants_pending: number;
  drivers_active: number;
  revenue: number;
}

export default function HomeScreen() {
  const { data, isLoading, isError, refetch } = useQuery<{ dashboard: Dashboard }>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const api = getApiClient();
      return api.get<{ dashboard: Dashboard }>('/admin/dashboard');
    },
  });

  if (isLoading) return <LoadingIndicator label="Memuat dashboard..." />;
  if (isError || !data)
    return <ErrorState message="Gagal memuat dashboard" onRetry={() => refetch()} />;

  const d = data.dashboard;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>Total Pendapatan (Pesanan Selesai)</Text>
        <Price amount={Number(d.revenue || 0)} size="title" color={brand.primary} />
      </Card>

      <View style={styles.grid}>
        <Metric
          label="Pesanan Hari Ini"
          value={String(d.orders_today || 0)}
          icon="🧾"
          color={brand.primary}
        />
        <Metric
          label="Merchant Menunggu"
          value={String(d.merchants_pending || 0)}
          icon="🏪"
          color={brand.secondary}
        />
      </View>
      <View style={styles.grid}>
        <Metric
          label="Kurir Aktif"
          value={String(d.drivers_active || 0)}
          icon="🛵"
          color={colors.info.DEFAULT}
        />
        <Metric
          label="Status"
          value="Aman"
          icon="✅"
          color={colors.success.DEFAULT}
        />
      </View>

      <Card style={styles.noteCard}>
        <Text style={styles.noteTitle}>Panel Operasional</Text>
        <Text style={styles.noteText}>
          Gunakan tab Pesanan, Dispatch, Validasi, Bantuan, dan Laporan untuk mengelola
          operasional PareFood. Semua tindakan dicatat di audit log.
        </Text>
      </Card>
    </ScrollView>
  );
}

function Metric({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <Card style={styles.metricCard}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={[styles.metricDot, { backgroundColor: color }]} />
    </Card>
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
  revenueCard: {
    marginBottom: spacing.md,
  },
  revenueLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metricCard: {
    flex: 1,
    paddingVertical: spacing.lg,
  },
  metricIcon: {
    fontSize: 22,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral[900],
    marginTop: spacing.xs,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
  },
  noteCard: {
    marginTop: spacing.sm,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  noteText: {
    fontSize: 13,
    color: colors.neutral[600],
    lineHeight: 20,
  },
});