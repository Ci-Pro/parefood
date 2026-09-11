import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Badge, Price, Input, LoadingIndicator, EmptyState } from '@parefood/design-system/react-native';
import { colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

interface OrderInfo {
  id: string;
  order_number: string;
  grand_total: number;
  delivery_address?: string;
  status: string;
  merchant_id?: string;
}

interface DeliveryRow {
  id: string;
  order_id: string;
  status: string;
  order?: OrderInfo | null;
}

const ACTIVE_STATUSES = ['ACCEPTED', 'PICKING_UP', 'PICKED_UP', 'ON_DELIVERY'];

const STATUS_LABEL: Record<string, string> = {
  ACCEPTED: 'Menunggu diambil',
  PICKING_UP: 'Menuju merchant',
  PICKED_UP: 'Dalam perjalanan',
  ON_DELIVERY: 'Sedang mengantar',
  DELIVERED: 'Terantar',
};

export default function JobsScreen() {
  const queryClient = useQueryClient();
  const [acting, setActing] = useState<string | null>(null);
  const [proofNotes, setProofNotes] = useState<Record<string, string>>({});

  const availableQuery = useQuery({
    queryKey: ['driver', 'available'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ orders: OrderInfo[] }>('/driver/available');
      return res.orders || [];
    },
  });

  const mineQuery = useQuery({
    queryKey: ['driver', 'mine'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ deliveries: DeliveryRow[] }>('/driver/mine', { size: '200' });
      return res.deliveries || [];
    },
  });

  const refreshQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['driver', 'available'] });
    queryClient.invalidateQueries({ queryKey: ['driver', 'mine'] });
    queryClient.invalidateQueries({ queryKey: ['driver', 'active', 'count'] });
  };

  const run = async (label: string, orderId: string, fn: () => Promise<unknown>) => {
    setActing(label + orderId);
    try {
      await fn();
      await refreshQueries();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Aksi gagal');
    } finally {
      setActing(null);
    }
  };

  if (availableQuery.isLoading || mineQuery.isLoading) {
    return <LoadingIndicator label="Memuat tugas..." />;
  }

  const available = availableQuery.data || [];
  const active = (mineQuery.data || []).filter((d) => ACTIVE_STATUSES.indexOf(d.status) !== -1);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={availableQuery.isFetching || mineQuery.isFetching} onRefresh={refreshQueries} />
        }
      >
        {active.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Sedang Aktif</Text>
            {active.map((delivery) => {
              const order = delivery.order;
              if (!order) return null;
              return (
                <Card key={delivery.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.orderNumber}>{order.order_number}</Text>
                    <Badge label={STATUS_LABEL[delivery.status] || delivery.status} variant="info" />
                  </View>
                  <Text style={styles.address}>{order.delivery_address || '-'}</Text>
                  <View style={styles.cardFooter}>
                    <Price amount={order.grand_total} size="body" />
                  </View>

                  {delivery.status === 'ACCEPTED' ? (
                    <View style={styles.row}>
                      <Button
                        label={acting === 'pickup' + delivery.id ? 'Memproses...' : 'Ambil di Merchant'}
                        size="sm"
                        fullWidth
                        loading={acting === 'pickup' + delivery.id}
                        onPress={() =>
                          run('pickup', delivery.id, () =>
                            apiPost(`/driver/orders/${order.id}/pickup`)
                          )
                        }
                      />
                    </View>
                  ) : null}

                  {delivery.status === 'PICKED_UP' ? (
                    <View>
                      <Input
                        value={proofNotes[delivery.id] || ''}
                        onChangeText={(t) => setProofNotes((prev) => ({ ...prev, [delivery.id]: t }))}
                        placeholder="Bukti / catatan pengantaran (opsional)"
                        style={{ marginBottom: spacing.sm }}
                      />
                      <Button
                        label={acting === 'deliver' + delivery.id ? 'Memproses...' : 'Selesai Antar'}
                        size="sm"
                        fullWidth
                        loading={acting === 'deliver' + delivery.id}
                        onPress={() =>
                          run('deliver', delivery.id, () =>
                            apiPost(`/driver/orders/${order.id}/deliver`, {
                              proof_note: proofNotes[delivery.id] || undefined,
                            })
                          )
                        }
                      />
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Pesanan Tersedia</Text>
        {available.length === 0 ? (
          <EmptyState
            icon={<Text style={styles.bigIcon}>📭</Text>}
            title="Tidak Ada Pesanan"
            description="Belum ada pesanan yang menunggu kurir. Tarik untuk memuat ulang."
          />
        ) : (
          available.map((order) => (
            <Card key={order.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderNumber}>{order.order_number}</Text>
                <Badge label="Siap diambil" variant="warning" />
              </View>
              <Text style={styles.address}>{order.delivery_address || '-'}</Text>
              <View style={styles.cardFooter}>
                <Price amount={order.grand_total} size="body" />
                <Button
                  label={acting === 'accept' + order.id ? 'Memproses...' : 'Terima'}
                  size="sm"
                  loading={acting === 'accept' + order.id}
                  onPress={() =>
                    run('accept', order.id, () => apiPost(`/driver/orders/${order.id}/accept`))
                  }
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

async function apiPost(path: string, body?: unknown) {
  const api = getApiClient();
  return api.post(path, body);
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  container: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
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
  row: {
    marginTop: spacing.md,
  },
  bigIcon: {
    fontSize: 40,
  },
});