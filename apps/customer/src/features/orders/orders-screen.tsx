import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Card,
  StatusBadge,
  Price,
  LoadingIndicator,
  ErrorState,
  EmptyState,
} from '@parefood/design-system/react-native';
import { brand, colors, spacing, typography } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';
import type { Order } from '@parefood/types';

type Navigation = NativeStackNavigationProp<Record<string, unknown>>;

export function OrdersScreen() {
  const navigation = useNavigation<Navigation>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ orders: Order[] }>('/orders/mine');
      return res.orders || [];
    },
  });

  const orders = data || ([] as Order[]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pesanan Saya</Text>
      </View>

      {isLoading ? (
        <LoadingIndicator label="Memuat pesanan..." />
      ) : isError ? (
        <ErrorState message="Gagal memuat pesanan" onRetry={() => refetch()} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Belum Ada Pesanan"
          description="Pesan makanan pertamamu sekarang!"
          icon={<Text style={styles.emptyIcon}>🧾</Text>}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card
              style={styles.orderCard}
              onPress={() =>
                navigation.navigate('OrderDetail' as never, { orderId: item.id } as never)
              }
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderNumber}>{item.order_number}</Text>
                  <Text style={styles.merchantName}>
                    {item.merchant_name || 'Merchant'}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              <View style={styles.orderFooter}>
                <Text style={styles.orderDate}>
                  {new Date(item.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  · {new Date(item.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Price amount={Number(item.grand_total)} size="body" color={brand.primary} />
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: brand.primary,
  },
  header: {
    padding: spacing.lg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  list: {
    padding: spacing.md,
  },
  orderCard: {
    marginBottom: spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '600',
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing.sm,
  },
  orderDate: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  emptyIcon: {
    fontSize: 48,
  },
});