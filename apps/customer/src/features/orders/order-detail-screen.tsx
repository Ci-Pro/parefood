import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  Card,
  StatusBadge,
  Price,
  LoadingIndicator,
  ErrorState,
  Button,
} from '@parefood/design-system/react-native';
import { brand, colors, spacing, radius } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

type Navigation = { navigate: (s: string, p?: unknown) => void };

interface OrderItem {
  id: string;
  menu_item_id?: string;
  name?: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  options?: { option_name: string; option_price: number }[];
}

interface StatusHistory {
  to_status: string;
  reason?: string;
  created_at: string;
}

interface OrderResponse {
  order: {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    payment_method?: string;
    merchant_name?: string;
    delivery_address?: string;
    subtotal: number;
    discount: number;
    delivery_fee: number;
    service_fee: number;
    tax: number;
    grand_total: number;
    items: OrderItem[];
    status_history?: StatusHistory[];
    created_at: string;
  };
}

export function OrderDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation<Navigation>();
  const queryClient = useQueryClient();
  const params = route.params as { orderId: string } | undefined;
  const orderId = params?.orderId || '';
  const [confirming, setConfirming] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<OrderResponse>({
    queryKey: ['order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const api = getApiClient();
      return api.get<OrderResponse>(`/orders/${orderId}`);
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async (reason?: string) => {
      const api = getApiClient();
      return api.post(`/orders/${orderId}/cancel`, { reason });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: () => alert('Gagal membatalkan pesanan'),
  });

  const confirmDelivery = useMutation({
    mutationFn: async () => {
      const api = getApiClient();
      return api.post(`/orders/${orderId}/confirm-delivery`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: () => alert('Gagal konfirmasi pesanan'),
  });

  const order = data?.order;

  if (isLoading) return <LoadingIndicator label="Memuat pesanan..." />;
  if (isError || !order)
    return <ErrorState message="Pesanan tidak ditemukan" onRetry={() => refetch()} />;

  const canCancel = ['PENDING_PAYMENT', 'PAID', 'WAITING_MERCHANT'].includes(order.status);
  const canConfirm = order.status === 'DELIVERED';
  const canReview = order.status === 'COMPLETED';
  const needsPayment = order.status === 'PENDING_PAYMENT' && order.payment_method !== 'cash';

  const paymentLabel: Record<string, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    bank_transfer: 'Transfer Bank',
    virtual_account: 'Virtual Account',
    ewallet: 'E-Wallet',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status */}
      <View style={styles.statusHeader}>
        <View style={styles.statusRow}>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <StatusBadge status={order.status} />
        </View>
        <Text style={styles.orderDate}>
          {new Date(order.created_at).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Merchant & address */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Merchant</Text>
          <Text style={styles.sectionValue}>{order.merchant_name || '-'}</Text>
        </View>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Alamat</Text>
          <Text style={styles.sectionValue}>{order.delivery_address || '-'}</Text>
        </View>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Pembayaran</Text>
          <Text style={styles.sectionValue}>
            {paymentLabel[order.payment_method || ''] || order.payment_method || '-'}
          </Text>
        </View>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Status Pembayaran</Text>
          <Text style={styles.sectionValue}>
            {order.payment_status === 'PAID' ? 'Lunas ✓' : 'Belum Bayar'}
          </Text>
        </View>
      </Card>

      {/* Items */}
      <Text style={styles.sectionTitle}>Rincian Pesanan</Text>
      {order.items.map((item) => {
        const optionsTotal = (item.options || []).reduce((s, o) => s + o.option_price, 0);
        return (
          <Card key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name || 'Item'}</Text>
              <Text style={styles.itemQty}>×{item.quantity}</Text>
            </View>
            {(item.options || []).length > 0 ? (
              <Text style={styles.itemOptions}>
                {item.options!.map((o) => o.option_name).join(', ')}
              </Text>
            ) : null}
            <View style={styles.itemFooter}>
              <Price amount={item.unit_price * item.quantity + optionsTotal} size="body" />
            </View>
          </Card>
        );
      })}

      {/* Pricing */}
      <Text style={styles.sectionTitle}>Pembayaran</Text>
      <Card>
        <Row label="Subtotal" value={order.subtotal} />
        <Row label="Diskon" value={order.discount} negative />
        <Row label="Biaya Pengantaran" value={order.delivery_fee} />
        <Row label="Biaya Layanan" value={order.service_fee} />
        <Row label="Pajak" value={order.tax} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Price amount={order.grand_total} size="body" color={brand.primary} />
        </View>
      </Card>

      {/* Status history */}
      {(order.status_history || []).length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Riwayat Status</Text>
          <Card>
            {(order.status_history || []).map((h, index) => (
              <View
                key={index}
                style={[
                  styles.historyRow,
                  index < (order.status_history || []).length - 1 && styles.historyRowLast,
                ]}
              >
                <View style={styles.historyDot} />
                <View style={styles.historyBody}>
                  <StatusBadge status={h.to_status} />
                  <Text style={styles.historyTime}>
                    {new Date(h.created_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {/* Actions */}
      {needsPayment ? (
        <View style={styles.actionBtn}>
          <Button
            label="Konfirmasi Pembayaran"
            size="lg"
            fullWidth
            onPress={() =>
              navigation.navigate('PayConfirm', {
                orderId: order.id,
                method: order.payment_method || 'bank_transfer',
              })
            }
          />
        </View>
      ) : null}

      {canConfirm ? (
        <View style={styles.actionBtn}>
          <Button
            label={confirming ? 'Memproses...' : 'Konfirmasi Pesanan Selesai'}
            size="lg"
            fullWidth
            loading={confirming}
            onPress={() => {
              setConfirming(true);
              confirmDelivery.mutate(undefined, { onSettled: () => setConfirming(false) });
            }}
          />
        </View>
      ) : null}

      {canReview ? (
        <View style={styles.actionBtn}>
          <Button
            label="Beri Ulasan"
            size="lg"
            fullWidth
            variant="secondary"
            onPress={() =>
              navigation.navigate('ReviewForm', {
                orderId: order.id,
              })
            }
          />
        </View>
      ) : null}

      {canCancel ? (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() =>
            Alert.alert('Batalkan Pesanan?', 'Tindakan ini tidak dapat dibatalkan.', [
              { text: 'Tidak', style: 'cancel' },
              { text: 'Batalkan Pesanan', style: 'destructive', onPress: () => cancelOrder.mutate() },
            ])
          }
        >
          <Text style={styles.cancelText}>Batalkan Pesanan</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

function Row({ label, value, negative = false }: { label: string; value: number; negative?: boolean }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {negative && value > 0 ? (
        <Text style={[styles.sectionValue, styles.discountText]}>−{`Rp ${value.toLocaleString('id-ID')}`}</Text>
      ) : (
        <Price amount={value} size="caption" weight="regular" />
      )}
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
  statusHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral[900],
  },
  orderDate: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: spacing.sm,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    flex: 1,
  },
  sectionValue: {
    fontSize: 14,
    color: colors.neutral[800],
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  discountText: {
    color: colors.success.DEFAULT,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  itemCard: {
    marginBottom: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    flex: 1,
  },
  itemQty: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[500],
    marginLeft: spacing.sm,
  },
  itemOptions: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  itemFooter: {
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  historyRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  historyRowLast: {
    paddingBottom: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.neutral[100],
    marginLeft: 4,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: brand.primary,
    marginRight: spacing.sm,
    marginTop: 4,
  },
  historyBody: {
    flex: 1,
  },
  historyTime: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: 2,
  },
  actionBtn: {
    marginTop: spacing.lg,
  },
  cancelBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  cancelText: {
    color: colors.danger.DEFAULT,
    fontSize: 15,
    fontWeight: '600',
  },
});