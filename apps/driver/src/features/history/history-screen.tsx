import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Price, Badge, LoadingIndicator, EmptyState } from '@parefood/design-system/react-native';
import { colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

interface OrderInfo {
  id: string;
  order_number: string;
  grand_total: number;
  delivery_address?: string;
  status: string;
}

interface DeliveryRow {
  id: string;
  order_id: string;
  status: string;
  order?: OrderInfo | null;
  created_at?: string;
}

export default function HistoryScreen() {
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['driver', 'history'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ deliveries: DeliveryRow[] }>('/driver/mine', { size: '200' });
      return (res.deliveries || []).filter((d) => d.status === 'DELIVERED');
    },
  });

  if (historyQuery.isLoading) {
    return <LoadingIndicator label="Memuat riwayat..." />;
  }

  const deliveries = historyQuery.data || [];

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <FlatList
        contentContainerStyle={styles.container}
        data={deliveries}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={historyQuery.isFetching}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['driver', 'history'] })}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Text style={styles.bigIcon}>🧾</Text>}
            title="Belum Ada Riwayat"
            description="Pesanan yang sudah Anda antar akan muncul di sini."
          />
        }
        renderItem={({ item }) => {
          const order = item.order;
          if (!order) return null;
          return (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderNumber}>{order.order_number}</Text>
                <Badge label="Terantar" variant="success" />
              </View>
              <Text style={styles.address}>{order.delivery_address || '-'}</Text>
              <View style={styles.cardFooter}>
                <Price amount={order.grand_total} size="body" />
                <Text style={styles.date}>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : ''}
                </Text>
              </View>
            </Card>
          );
        }}
      />
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
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    flex: 1,
  },
  address: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  date: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  bigIcon: {
    fontSize: 40,
  },
});