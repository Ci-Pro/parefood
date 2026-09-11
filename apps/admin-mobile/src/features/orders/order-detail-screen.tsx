import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { Card, StatusBadge, Price, LoadingIndicator, ErrorState, Button, Badge } from '@parefood/design-system/react-native';
import { brand, colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

interface DeliveryInfo {
  id: string;
  driver_id: string;
  status: string;
  accepted_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
}

interface AdminOrderDetail {
  order: {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    payment_method?: string;
    subtotal: number;
    discount: number;
    delivery_fee: number;
    service_fee: number;
    tax: number;
    grand_total: number;
    delivery_address?: string;
    created_at: string;
    delivery?: DeliveryInfo | null;
    items: { id: string; name?: string; quantity: number; unit_price: number; notes?: string }[];
    status_history?: { to_status: string; actor_role?: string; reason?: string; created_at: string }[];
  };
}

export default function OrderDetailScreen() {
  const route = useRoute();
  const queryClient = useQueryClient();
  const params = route.params as { orderId: string } | undefined;
  const orderId = params?.orderId || '';

  const { data, isLoading, isError, refetch } = useQuery<AdminOrderDetail>({
    queryKey: ['admin-order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const api = getApiClient();
      return api.get<AdminOrderDetail>(`/admin/orders/${orderId}`);
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async (reason: string) => {
      const api = getApiClient();
      return api.post(`/admin/orders/${orderId}/cancel`, { reason });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-dispatch'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      alert(err?.response?.data?.error?.message || err?.message || 'Gagal membatalkan pesanan');
    },
  });

  if (isLoading) return <LoadingIndicator label="Memuat pesanan..." />;
  if (isError || !data)
    return <ErrorState message="Pesanan tidak ditemukan" onRetry={() => refetch()} />;

  const order = data.order;
  const cancellable = ['PENDING_PAYMENT', 'PAID', 'WAITING_MERCHANT', 'MERCHANT_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DRIVER_ASSIGNED', 'PICKED_UP', 'ON_DELIVERY'].includes(order.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topCard}>
        <View style={styles.topRow}>
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

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Info Pesanan</Text>
        <Row label="Alamat" value={order.delivery_address || '-'} />
        <Row label="Pembayaran" value={labelMethod(order.payment_method)} />
        <Row label="Status Bayar" value={order.payment_status === 'PAID' ? 'Lunas' : order.payment_status || '-'} />
      </Card>

      <Text style={styles.sectionTitle}>Item</Text>
      {(order.items || []).map((item) => (
        <Card key={item.id} style={styles.itemCard}>
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name || 'Item'}</Text>
            <Text style={styles.itemQty}>×{item.quantity}</Text>
          </View>
          <Price amount={item.unit_price * item.quantity} size="caption" />
        </Card>
      ))}

      <Text style={styles.sectionTitle}>Pembayaran</Text>
      <Card>
        <Row label="Subtotal" value={formatIDR(order.subtotal)} />
        <Row label="Diskon" value={formatIDR(order.discount)} />
        <Row label="Biaya Antar" value={formatIDR(order.delivery_fee)} />
        <Row label="Biaya Layanan" value={formatIDR(order.service_fee)} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Price amount={order.grand_total} size="body" color={brand.primary} />
        </View>
      </Card>

      {order.delivery ? (
        <>
          <Text style={styles.sectionTitle}>Pengiriman</Text>
          <Card>
            <Row label="Kurir ID" value={order.delivery.driver_id} />
            <Row label="Status" value={order.delivery.status} />
          </Card>
        </>
      ) : null}

      {(order.status_history || []).length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Riwayat Status</Text>
          <Card>
            {(order.status_history || []).map((h, index) => (
              <View key={index} style={styles.historyRow}>
                <Badge label={h.to_status} small variant="neutral" />
                <Text style={styles.historyMeta}>
                  {h.actor_role || '-'} · {new Date(h.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {cancellable ? (
        <Button
          label="Batalkan Pesanan"
          variant="danger"
          size="lg"
          fullWidth
          style={styles.cancelBtn}
          onPress={() =>
            Alert.alert('Batalkan Pesanan?', 'Pesanan akan dibatalkan oleh admin.', [
              { text: 'Tidak', style: 'cancel' },
              { text: 'Batalkan', style: 'destructive', onPress: () => cancelOrder.mutate('Dibatalkan oleh admin') },
            ])
          }
        />
      ) : null}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function labelMethod(m?: string) {
  const map: Record<string, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    bank_transfer: 'Transfer Bank',
    virtual_account: 'Virtual Account',
    ewallet: 'E-Wallet',
  };
  return (m && map[m]) || m || '-';
}

function formatIDR(n: number) {
  return 'Rp ' + (Number(n || 0)).toLocaleString('id-ID');
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
  topCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  topRow: {
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
  card: {
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.neutral[500],
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    color: colors.neutral[800],
    flex: 2,
    textAlign: 'right',
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
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    flex: 1,
  },
  itemQty: {
    fontSize: 14,
    color: colors.neutral[500],
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
    marginBottom: spacing.sm,
  },
  historyMeta: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: 2,
  },
  cancelBtn: {
    marginTop: spacing.xl,
  },
});