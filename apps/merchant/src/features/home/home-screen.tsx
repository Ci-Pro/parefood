import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Badge,
  LoadingIndicator,
  EmptyState,
  ErrorState,
} from '@parefood/design-system/react-native';
import { brand, colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatIDR } from '@parefood/utils';

type Navigation = NativeStackNavigationProp<Record<string, unknown>>;

interface MerchantRow {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  status: string;
  is_open: boolean;
  min_order: number;
  rating?: number;
  rating_count?: number;
}

const STATUS_LABELS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  pending: { label: 'Menunggu Persetujuan', tone: 'warning' },
  approved: { label: 'Disetujui', tone: 'success' },
  rejected: { label: 'Ditolak', tone: 'danger' },
  suspended: { label: 'Ditangguhkan', tone: 'danger' },
  closed: { label: 'Ditutup', tone: 'neutral' },
};

function StatCard({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} disabled={!onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const queryClient = useQueryClient();
  const [toggling, setToggling] = useState(false);

  const merchantQuery = useQuery({
    queryKey: ['merchant', 'mine'],
    queryFn: async () => {
      const api = getApiClient();
      try {
        const res = await api.get<{ merchant: MerchantRow }>('/my/merchant');
        return res.merchant;
      } catch (e) {
        const anyError = e as { code?: number };
        if (anyError.code === 404) return null;
        throw e;
      }
    },
  });

  const incomingQuery = useQuery({
    queryKey: ['merchant', 'orders', 'incoming'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ orders: Array<{ status: string }> }>('/my/merchant/orders', {
        size: '200',
      });
      return res.orders.filter(
        (o) => ['PENDING_PAYMENT', 'PAID', 'WAITING_MERCHANT'].indexOf(o.status) !== -1
      ).length;
    },
  });

  const menuCountQuery = useQuery({
    queryKey: ['merchant', 'menu', 'count'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ items: unknown[] }>('/my/menu/items', { size: '100' });
      return res.items.length;
    },
  });

  const refreshing = merchantQuery.isFetching;

  const handleToggleOpen = async (nextValue: boolean) => {
    setToggling(true);
    try {
      const api = getApiClient();
      await api.put('/my/merchant', { is_open: nextValue });
      queryClient.invalidateQueries({ queryKey: ['merchant', 'mine'] });
    } finally {
      setToggling(false);
    }
  };

  if (merchantQuery.isLoading) {
    return <LoadingIndicator label="Memuat data toko..." />;
  }

  const merchant = merchantQuery.data;

  if (!merchant) {
    return (
      <SafeAreaView style={styles.flex} edges={['top']}>
        <EmptyState
          icon={<Text style={styles.bigIcon}>🏪</Text>}
          title="Belum Punya Toko"
          description="Daftarkan toko Anda sekarang untuk mulai berjualan di PareFood."
          action={
            <Button label="Daftarkan Toko" onPress={() => navigation.navigate('StoreApply' as never)} />
          }
        />
      </SafeAreaView>
    );
  }

  if (merchant.status === 'pending') {
    return (
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.container}>
          <Card>
            <View style={styles.approvalCard}>
              <Text style={styles.approvalIcon}>⏳</Text>
              <Text style={styles.approvalTitle}>Menunggu Persetujuan</Text>
              <Text style={styles.approvalBody}>
                Pengajuan toko Anda sedang ditinjau oleh tim PareFood. Anda bisa mengisi
                menu setelah toko disetujui.
              </Text>
              <Badge label={merchant.name} tone="primary" />
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (merchant.status === 'rejected' || merchant.status === 'suspended') {
    return (
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ErrorState
          title="Toko Tidak Aktif"
          message="Pengajuan Anda belum disetujui. Silakan hubungi tim PareFood untuk info lebih lanjut."
        />
      </SafeAreaView>
    );
  }

  const statusInfo = STATUS_LABELS[merchant.status] || STATUS_LABELS.closed;
  const incomingCount = incomingQuery.data ?? 0;

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ['merchant'] });
              queryClient.invalidateQueries({ queryKey: ['merchant', 'orders'] });
              queryClient.invalidateQueries({ queryKey: ['merchant', 'menu'] });
            }}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Selamat datang 👋</Text>
          <Text style={styles.storeName}>{merchant.name}</Text>
          <Text style={styles.storeAddress}>{merchant.address}</Text>
        </View>

        <Card>
          <View style={styles.openRow}>
            <View style={styles.flex}>
              <Text style={styles.openTitle}>Terima Pesanan Baru</Text>
              <Text style={styles.openSubtitle}>
                {merchant.is_open ? 'Toko sedang buka' : 'Toko sedang tutup'}
              </Text>
            </View>
            <Switch
              value={merchant.is_open}
              disabled={toggling}
              onValueChange={handleToggleOpen}
              trackColor={{ false: colors.neutral[300], true: brand.primary }}
            />
          </View>
          <View style={styles.openMeta}>
            <Badge label={statusInfo.label} tone={statusInfo.tone} />
            <Text style={styles.minOrder}>
              Min. pesanan: {formatIDR(merchant.min_order)}
            </Text>
          </View>
        </Card>

        <View style={styles.statsRow}>
          <StatCard
            label="Pesanan Masuk"
            value={String(incomingCount)}
            onPress={() => navigation.navigate('Main' as never)}
          />
          <StatCard
            label="Item Menu"
            value={String(menuCountQuery.data ?? 0)}
            onPress={() => navigation.navigate('Main' as never)}
          />
          <StatCard
            label="Rating"
            value={merchant.rating_count ? merchant.rating?.toFixed(1) ?? '0.0' : 'Baru'}
          />
        </View>

        <Button
          label="Kelola Pesanan"
          fullWidth
          onPress={() => navigation.navigate('Main' as never)}
        />

        <View style={styles.spacer} />
        <Button
          label="Kelola Menu"
          variant="secondary"
          fullWidth
          onPress={() => navigation.navigate('Main' as never)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  container: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 15,
    color: colors.neutral[500],
  },
  storeName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: spacing.xs,
  },
  storeAddress: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  openTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  openSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },
  openMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  minOrder: {
    fontSize: 13,
    color: colors.neutral[600],
  },
  statsRow: {
    flexDirection: 'row',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: brand.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  approvalCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  approvalIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  bigIcon: {
    fontSize: 40,
  },
  approvalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  approvalBody: {
    fontSize: 14,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  spacer: {
    height: spacing.sm,
  },
});