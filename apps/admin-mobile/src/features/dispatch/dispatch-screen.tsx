import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Card, StatusBadge, LoadingIndicator, ErrorState, EmptyState } from '@parefood/design-system/react-native';
import { colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

type Navigation = { navigate: (s: string, p?: unknown) => void };

interface DispatchOrder {
  id: string;
  order_number: string;
  merchant_id?: string;
  delivery_address?: string;
  status: string;
  created_at: string;
  delivery?: {
    id: string;
    driver_id: string;
    status: string;
    picked_up_at?: string;
    delivered_at?: string;
  } | null;
}

export default function DispatchScreen() {
  const navigation = useNavigation<Navigation>();

  const { data, isLoading, isError, refetch } = useQuery<{
    orders: DispatchOrder[];
  }>({
    queryKey: ['admin-dispatch'],
    queryFn: async () => {
      const api = getApiClient();
      return api.get<{ orders: DispatchOrder[] }>('/admin/dispatch');
    },
  });

  if (isLoading) return <LoadingIndicator label="Memuat operasional..." />;
  if (isError || !data)
    return <ErrorState message="Gagal memuat data dispatch" onRetry={() => refetch()} />;

  const orders = data.orders || [];

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={orders}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={
        <Text style={styles.sectionTitle}>
          Pesanan Dalam Proses ({orders.length})
        </Text>
      }
      ListEmptyComponent={<EmptyState title="Tidak ada pesanan dalam proses" />}
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('OrderDetail', { orderId: item.id } as never)}
        >
          <Card style={styles.orderCard}>
            <View style={styles.orderRow}>
              <Text style={styles.orderNumber}>{item.order_number}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.orderExtra} numberOfLines={1}>
              Pengiriman: {item.delivery_address || '-'}
            </Text>
            <View style={styles.footer}>
              <Text style={styles.dim}>
                {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {item.delivery && item.delivery.driver_id ? (
                <View style={styles.driverBadge}>
                  <Text style={styles.driverText}>🛵 {item.delivery.driver_id.slice(0, 8)}</Text>
                </View>
              ) : null}
            </View>
          </Card>
        </TouchableOpacity>
      )}
    />
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  orderCard: {
    marginBottom: spacing.sm,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  orderExtra: {
    fontSize: 13,
    color: colors.neutral[600],
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  dim: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  driverBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  driverText: {
    fontSize: 12,
    color: colors.primary[700],
    fontWeight: '600',
  },
});