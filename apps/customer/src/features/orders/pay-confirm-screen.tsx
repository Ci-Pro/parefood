import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  Button,
  Card,
  Price,
  Input,
  LoadingIndicator,
  ErrorState,
} from '@parefood/design-system/react-native';
import { brand, colors, spacing, radius } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

type Navigation = { replace: (s: string, p?: unknown) => void };

interface RouteParams {
  orderId: string;
  method?: string;
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tunai',
  bank_transfer: 'Transfer Bank',
  qris: 'QRIS',
  virtual_account: 'Virtual Account',
  ewallet: 'E-Wallet',
};

interface OrderResponse {
  order: {
    order_number: string;
    merchant_name?: string;
    status: string;
    grand_total: number;
    payment_method?: string;
  };
}

export default function PayConfirmScreen() {
  const route = useRoute();
  const navigation = useNavigation<Navigation>();
  const queryClient = useQueryClient();
  const params = route.params as RouteParams | undefined;
  const orderId = params?.orderId || '';
  const method = params?.method || 'bank_transfer';
  const [proofUrl, setProofUrl] = useState('');
  const [note, setNote] = useState('');

  const { data, isLoading, isError, refetch } = useQuery<OrderResponse>({
    queryKey: ['order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const api = getApiClient();
      return api.get<OrderResponse>(`/orders/${orderId}`);
    },
  });

  const confirm = useMutation({
    mutationFn: async () => {
      const api = getApiClient();
      return api.post(`/payments/orders/${orderId}/confirm`, {
        method,
        proof_url: proofUrl || undefined,
        note: note || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigation.replace('OrderDetail', { orderId });
    },
    onError: (e) => {
      alert(e instanceof Error ? e.message : 'Gagal konfirmasi pembayaran');
    },
  });

  if (isLoading) return <LoadingIndicator label="Memuat detail pesanan..." />;
  if (isError || !data?.order)
    return <ErrorState message="Pesanan tidak ditemukan" onRetry={() => refetch()} />;

  const order = data.order;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.hintCard}>
          <Text style={styles.hintTitle}>Lakukan pembayaran</Text>
          <Text style={styles.hintText}>
            Pesanan {order.order_number} menunggu pembayaran {PAYMENT_LABEL[method] || method}.
            Silakan selesaikan pembayaran sejumlah:
          </Text>
          <View style={styles.amountBadge}>
            <Price amount={order.grand_total} size="lg" color={brand.primary} />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Bukti Pembayaran</Text>
        <Input
          value={proofUrl}
          onChangeText={setProofUrl}
          placeholder="Link gambar bukti transfer (opsional)"
          autoCapitalize="none"
          style={{ marginBottom: spacing.sm }}
        />
        <Input
          value={note}
          onChangeText={setNote}
          placeholder="Catatan (opsional)"
          style={{ marginBottom: spacing.sm }}
        />

        <Text style={styles.noteText}>
          Setelah dikonfirmasi, pesanan otomatis dilanjutkan ke merchant untuk disiapkan.
        </Text>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          label={confirm.isPending ? 'Memproses...' : 'Saya Sudah Bayar'}
          size="lg"
          fullWidth
          loading={confirm.isPending}
          onPress={() => confirm.mutate()}
        />
      </View>
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
    paddingBottom: 120,
  },
  hintCard: {
    marginBottom: spacing.md,
  },
  hintTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  hintText: {
    fontSize: 14,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  amountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  noteText: {
    fontSize: 13,
    color: colors.neutral[400],
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
});