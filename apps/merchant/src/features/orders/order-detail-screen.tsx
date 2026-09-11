import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  StatusBadge,
  LoadingIndicator,
  ErrorState,
} from '@parefood/design-system/react-native';
import { brand, colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatIDR } from '@parefood/utils';
import { useRoute, RouteProp } from '@react-navigation/native';

type Route = RouteProp<Record<string, unknown>, string>;

interface OrderItemRow {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  variant_name?: string;
  variant_price?: number;
  notes?: string;
  options?: Array<{ addon_name: string; option_name: string; option_price: number }>;
}

interface OrderRow {
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
  delivery_address?: string;
  customer_notes?: string;
  estimated_time_minutes?: number;
  created_at: string;
  items?: OrderItemRow[];
}

export function OrderDetailScreen() {
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const params = (route.params || {}) as { orderId?: string };
  const orderId = params.orderId;

  const [acting, setActing] = useState(false);

  const orderQuery = useQuery({
    queryKey: ['merchant', 'orders', orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ order: OrderRow }>(`/my/merchant/orders/${orderId}`);
      return res.order;
    },
  });

  const order = orderQuery.data;

  const runAction = async (
    endpoint: string,
    successMessage: string,
    body?: { reason?: string }
  ) => {
    setActing(true);
    try {
      const api = getApiClient();
      await api.post(endpoint, body);
      queryClient.invalidateQueries({ queryKey: ['merchant', 'orders'] });
      await orderQuery.refetch();
      Alert.alert('Berhasil', successMessage);
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Aksi gagal');
    } finally {
      setActing(false);
    }
  };

  const handleReject = () => {
    Alert.alert('Tolak Pesanan', 'Tolak pesanan ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Tolak',
        style: 'destructive',
        onPress: () => runAction(`/my/merchant/orders/${orderId}/reject`, 'Pesanan ditolak', {
          reason: 'Ditolak oleh merchant',
        }),
      },
    ]);
  };

  if (orderQuery.isLoading) {
    return <LoadingIndicator label="Memuat detail pesanan..." />;
  }

  if (orderQuery.error || !order) {
    return <ErrorState message="Gagal memuat pesanan." onRetry={() => orderQuery.refetch()} />;
  }

  const status = order.status;
  const canAccept = ['PAID', 'WAITING_MERCHANT'].indexOf(status) !== -1;
  const canPreparing = status === 'MERCHANT_ACCEPTED';
  const canReady = ['PREPARING', 'MERCHANT_ACCEPTED'].indexOf(status) !== -1;

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <StatusBadge status={status} />
          <Text style={styles.time}>
            {new Date(order.created_at).toLocaleString('id-ID', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Detail Pengiriman</Text>
          <Text style={styles.detailText}>{order.delivery_address || '-'}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Pembayaran</Text>
            <Text style={styles.metaValue}>
              {String(order.payment_method || '-').toUpperCase()} · {order.payment_status}
            </Text>
          </View>
          {order.customer_notes ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Catatan</Text>
              <Text style={styles.metaValue}>{order.customer_notes}</Text>
            </View>
          ) : null}
        </Card>

        <Text style={styles.sectionTitle}>Item Pesanan</Text>
        <Card>
          {(order.items || []).map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>
                  {item.quantity}× {item.name}
                </Text>
                {item.variant_name ? (
                  <Text style={styles.itemSub}>{item.variant_name}</Text>
                ) : null}
                {(item.options || []).map((o, i) => (
                  <Text key={i} style={styles.itemSub}>
                    + {o.addon_name}: {o.option_name}
                  </Text>
                ))}
                {item.notes ? <Text style={styles.itemSub}>Catatan: {item.notes}</Text> : null}
              </View>
              <Text style={styles.itemPrice}>
                {formatIDR(item.unit_price * item.quantity)}
              </Text>
            </View>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>Rincian Biaya</Text>
        <Card>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatIDR(order.subtotal)}</Text>
          </View>
          {order.discount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Diskon</Text>
              <Text style={[styles.totalValue, { color: colors.danger.DEFAULT }]}>
                -{formatIDR(order.discount)}
              </Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Biaya Antar</Text>
            <Text style={styles.totalValue}>{formatIDR(order.delivery_fee)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Biaya Layanan</Text>
            <Text style={styles.totalValue}>{formatIDR(order.service_fee)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatIDR(order.grand_total)}</Text>
          </View>
        </Card>

        <View style={styles.actions}>
          {canAccept ? (
            <>
              <Button
                label="Terima Pesanan"
                size="lg"
                loading={acting}
                fullWidth
                onPress={() => runAction(`/my/merchant/orders/${orderId}/accept`, 'Pesanan diterima')}
              />
              <Button
                label="Tolak Pesanan"
                variant="danger"
                size="lg"
                fullWidth
                onPress={handleReject}
              />
            </>
          ) : null}

          {canPreparing ? (
            <Button
              label="Mulai Siapkan"
              size="lg"
              loading={acting}
              fullWidth
              onPress={() => runAction(`/my/merchant/orders/${orderId}/preparing`, 'Diproses')}
            />
          ) : null}

          {canReady ? (
            <Button
              label="Tandai Siap Diambil"
              size="lg"
              loading={acting}
              fullWidth
              variant="secondary"
              onPress={() => runAction(`/my/merchant/orders/${orderId}/ready`, 'Siap diambil')}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral[50] },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  header: {
    marginBottom: spacing.lg,
  },
  orderNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  time: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: 15,
    color: colors.neutral[800],
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  metaLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  metaValue: {
    fontSize: 14,
    color: colors.neutral[900],
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  itemSub: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.neutral[600],
  },
  totalValue: {
    fontSize: 14,
    color: colors.neutral[900],
    fontWeight: '600',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral[900],
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: brand.primary,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});