import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
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
import type { CustomerAddress } from '@parefood/types';

interface AddressRow {
  id: string;
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  note?: string;
}

type Navigation = { navigate: (s: string, p?: unknown) => void };

interface CheckoutResponse {
  order_id: string;
  order_number: string;
  status: string;
  grand_total: number;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  discount: number;
  tax: number;
}

export default function CheckoutScreen() {
  const navigation = useNavigation<Navigation>();
  const queryClient = useQueryClient();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const api = getApiClient();
      return api.get<{ cart: { subtotal: number; items: unknown[]; merchant_id: string } }>('/cart');
    },
  });

  const { data: addressData } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ addresses: AddressRow[] }>('/addresses');
      return res.addresses;
    },
  });

  const addresses = addressData || [];
  const cart = cartData?.cart;
  const subtotal = cart?.subtotal || 0;

  const checkout = useMutation({
    mutationFn: async () => {
      const api = getApiClient();
      return api.post<CheckoutResponse>('/orders/checkout', {
        address_id: selectedAddressId,
        payment_method: paymentMethod,
        customer_notes: notes || undefined,
        promotion_code: promoCode || undefined,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigation.navigate('OrderDetail', { orderId: result.order_id });
    },
    onError: (e) => {
      alert(e instanceof Error ? e.message : 'Checkout gagal');
    },
  });

  if (cartLoading) return <LoadingIndicator label="Memuat..." />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Address */}
        <Text style={styles.sectionTitle}>Alamat Pengantaran</Text>
        {addresses.length === 0 ? (
          <Card>
            <Text style={styles.addressEmpty}>
              Belum ada alamat. Tambahkan alamat di menu Profil.
            </Text>
          </Card>
        ) : (
          addresses.map((addr) => (
            <TouchableOpacity
              key={addr.id}
              style={[
                styles.addressCard,
                selectedAddressId === addr.id && styles.addressCardSelected,
              ]}
              onPress={() => setSelectedAddressId(addr.id)}
            >
              <View style={styles.addressRow}>
                <View style={styles.radioOuter}>
                  <View
                    style={[
                      styles.radioInner,
                      selectedAddressId === addr.id && styles.radioInnerActive,
                    ]}
                  />
                </View>
                <View style={styles.addressInfo}>
                  <Text style={styles.addressLabel}>
                    {addr.label} {addr.is_default ? '· Default' : ''}
                  </Text>
                  <Text style={styles.addressText}>{addr.address}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Payment method */}
        <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
        <View style={styles.paymentRow}>
          {[
            { key: 'cash', label: '💵 Tunai' },
            { key: 'qris', label: '📱 QRIS' },
            { key: 'ewallet', label: '👛 E-Wallet' },
          ].map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[
                styles.paymentOption,
                paymentMethod === m.key && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod(m.key)}
            >
              <Text
                style={[
                  styles.paymentText,
                  paymentMethod === m.key && styles.paymentTextSelected,
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Promo */}
        <Text style={styles.sectionTitle}>Kode Promo</Text>
        <View style={styles.promoRow}>
          <View style={styles.promoInput}>
            <Input
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="Masukkan kode promo"
              autoCapitalize="characters"
              style={{ marginBottom: 0 }}
            />
          </View>
        </View>

        {/* Notes */}
        <Text style={styles.sectionTitle}>Catatan Pesanan</Text>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="Contoh: Jangan pakai bawang, tambah sambal..."
          multiline
          numberOfLines={3}
          style={styles.notesInput}
        />

        {/* Summary */}
        <Text style={styles.sectionTitle}>Ringkasan Pembayaran</Text>
        <Card>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Price amount={subtotal} size="body" />
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya Pengantaran</Text>
            <Text style={styles.estText}>Dihitung saat checkout</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya Layanan</Text>
            <Text style={styles.estText}>Akan ditambahkan</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Dihitung otomatis</Text>
          </View>
        </Card>

        {cart?.items?.length === 0 && (
          <Text style={styles.emptyError}>Keranjang kosong, tidak bisa checkout</Text>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          label={checkout.isPending ? 'Memproses...' : 'Buat Pesanan'}
          size="lg"
          fullWidth
          disabled={!selectedAddressId || (cart?.items?.length || 0) === 0}
          loading={checkout.isPending}
          onPress={() => checkout.mutate()}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    marginBottom: spacing.sm,
  },
  addressCardSelected: {
    borderColor: brand.primary,
    backgroundColor: '#ECFDF5',
  },
  addressRow: {
    flexDirection: 'row',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  radioInnerActive: {
    backgroundColor: brand.primary,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  addressText: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  addressEmpty: {
    color: colors.neutral[500],
    fontSize: 14,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentOption: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  paymentOptionSelected: {
    borderColor: brand.primary,
    backgroundColor: '#ECFDF5',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[600],
  },
  paymentTextSelected: {
    color: brand.primary,
    fontWeight: '700',
  },
  promoRow: {
    marginBottom: spacing.sm,
  },
  promoInput: {
    flex: 1,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.neutral[600],
  },
  estText: {
    fontSize: 14,
    color: colors.neutral[400],
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: brand.primary,
  },
  emptyError: {
    textAlign: 'center',
    color: colors.danger.DEFAULT,
    marginTop: spacing.lg,
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