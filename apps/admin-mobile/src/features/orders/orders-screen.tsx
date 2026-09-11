import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Card, StatusBadge, Price, LoadingIndicator, ErrorState, EmptyState } from '@parefood/design-system/react-native';
import { colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

type Navigation = { navigate: (s: string, p?: unknown) => void };

interface AdminOrder {
  id: string;
  order_number: string;
  status: string;
  customer_id: string;
  merchant_id: string;
  grand_total: number;
  payment_method?: string;
  created_at: string;
}

const FILTERS = [
  { key: '', label: 'Semua' },
  { key: 'PAID', label: 'Dibayar' },
  { key: 'WAITING_MERCHANT', label: 'Menunggu Merchant' },
  { key: 'READY_FOR_PICKUP', label: 'Siap Diambil' },
  { key: 'DELIVERED', label: 'Terkirim' },
  { key: 'COMPLETED', label: 'Selesai' },
];

export default function OrdersScreen() {
  const navigation = useNavigation<Navigation>();
  const [status, setStatus] = React.useState('');

  const { data, isLoading, isError, refetch } = useQuery<{ orders: AdminOrder[] }>({
    queryKey: ['admin-orders', status],
    queryFn: async () => {
      const api = getApiClient();
      return api.get<{ orders: AdminOrder[] }>('/admin/orders', { status, size: 50 });
    },
  });

  const orders = data?.orders || [];

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(f) => f.key || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, status === item.key && styles.chipActive]}
              onPress={() => setStatus(item.key)}
            >
              <Text style={[styles.chipText, status === item.key && styles.chipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <LoadingIndicator label="Memuat pesanan..." />
      ) : isError ? (
        <ErrorState message="Gagal memuat pesanan" onRetry={() => refetch()} />
      ) : orders.length === 0 ? (
        <EmptyState title="Belum ada pesanan" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id } as never)}
            >
              <Card style={styles.orderCard}>
                <View style={styles.orderRow}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>{item.order_number}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(item.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>
                <View style={styles.orderFooter}>
                  <Price amount={Number(item.grand_total)} size="body" />
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  filters: {
    paddingVertical: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    marginHorizontal: 4,
  },
  chipActive: {
    backgroundColor: colors.primary[600],
  },
  chipText: {
    fontSize: 13,
    color: colors.neutral[700],
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  list: {
    padding: spacing.md,
  },
  orderCard: {
    marginBottom: spacing.sm,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  orderDate: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: 2,
  },
  orderFooter: {
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
});