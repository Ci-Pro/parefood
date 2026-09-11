import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Card,
  StatusBadge,
  LoadingIndicator,
  ErrorState,
  EmptyState,
} from '@parefood/design-system/react-native';
import { brand, colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatIDR } from '@parefood/utils';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Navigation = NativeStackNavigationProp<Record<string, unknown>>;

interface MerchantOrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  service_fee: number;
  tax: number;
  grand_total: number;
  customer_notes?: string;
  created_at: string;
}

type FilterKey = 'all' | 'new' | 'processing' | 'done' | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'new', label: 'Baru' },
  { key: 'processing', label: 'Diproses' },
  { key: 'done', label: 'Selesai' },
  { key: 'cancelled', label: 'Batal' },
];

const NEW_STATUSES = ['PENDING_PAYMENT', 'PAID', 'WAITING_MERCHANT'];
const PROCESSING_STATUSES = ['MERCHANT_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'ON_DELIVERY'];
const DONE_STATUSES = ['DELIVERED', 'COMPLETED'];
const CANCELLED_STATUSES = ['CANCELLED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_MERCHANT', 'CANCELLED_BY_ADMIN', 'REJECTED_BY_MERCHANT', 'FAILED'];

function matchesFilter(status: string, filter: FilterKey): boolean {
  switch (filter) {
    case 'new':
      return NEW_STATUSES.indexOf(status) !== -1;
    case 'processing':
      return PROCESSING_STATUSES.indexOf(status) !== -1;
    case 'done':
      return DONE_STATUSES.indexOf(status) !== -1;
    case 'cancelled':
      return CANCELLED_STATUSES.indexOf(status) !== -1;
    default:
      return true;
  }
}

export function OrdersScreen() {
  const navigation = useNavigation<Navigation>();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const ordersQuery = useQuery({
    queryKey: ['merchant', 'orders'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ orders: MerchantOrderRow[] }>('/my/merchant/orders', { size: '200' });
      return res.orders;
    },
  });

  const orders = (ordersQuery.data ?? []).filter((o) => matchesFilter(o.status, filter));

  const handleAccept = (order: MerchantOrderRow) => {
    Alert.alert('Terima Pesanan', `Terima pesanan ${order.order_number}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Terima',
        onPress: async () => {
          setAcceptingId(order.id);
          try {
            const api = getApiClient();
            await api.post(`/my/merchant/orders/${order.id}/accept`);
            queryClient.invalidateQueries({ queryKey: ['merchant', 'orders'] });
            queryClient.invalidateQueries({ queryKey: ['merchant', 'orders', 'incoming'] });
          } catch (e) {
            Alert.alert('Gagal', e instanceof Error ? e.message : 'Gagal menerima pesanan');
          } finally {
            setAcceptingId(null);
          }
        },
      },
    ]);
  };

  if (ordersQuery.isLoading) {
    return <LoadingIndicator label="Memuat pesanan..." />;
  }

  if (ordersQuery.error) {
    return <ErrorState message="Gagal memuat pesanan." onRetry={() => ordersQuery.refetch()} />;
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Pesanan</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={ordersQuery.isFetching}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['merchant', 'orders'] })}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Text style={styles.bigIcon}>🧾</Text>}
            title="Tidak Ada Pesanan"
            description="Pesanan baru akan muncul di sini."
          />
        }
        renderItem={({ item }) => {
          const canAccept = NEW_STATUSES.indexOf(item.status) !== -1;
          return (
            <Card
              padding="md"
              style={styles.orderCard}
              onPress={() => navigation.navigate('OrderDetail' as never, { orderId: item.id } as never)}
            >
              <View style={styles.orderTop}>
                <Text style={styles.orderNumber}>{item.order_number}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.orderTime}>{formatTime(item.created_at)}</Text>
              <View style={styles.orderBottom}>
                <Text style={styles.orderTotal}>{formatIDR(item.grand_total)}</Text>
                {canAccept ? (
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    disabled={acceptingId === item.id}
                    onPress={() => handleAccept(item)}
                  >
                    <Text style={styles.acceptText}>
                      {acceptingId === item.id ? 'Memproses...' : 'Terima'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value || '';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  filterChipActive: {
    backgroundColor: brand.primary,
    borderColor: brand.primary,
  },
  filterText: {
    fontSize: 13,
    color: colors.neutral[600],
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
  orderCard: {
    marginBottom: spacing.md,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  orderTime: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  orderBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  orderTotal: {
    fontSize: 17,
    fontWeight: '800',
    color: brand.primary,
  },
  acceptBtn: {
    backgroundColor: brand.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  acceptText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  bigIcon: {
    fontSize: 40,
  },
});