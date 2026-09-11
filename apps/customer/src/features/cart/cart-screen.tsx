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
import { useNavigation } from '@react-navigation/native';
import {
  Button,
  Card,
  Price,
  EmptyState,
  LoadingIndicator,
  ErrorState,
} from '@parefood/design-system/react-native';
import { brand, colors, spacing, radius } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

type Navigation = { navigate: (s: string, p?: unknown) => void };

interface CartAddon {
  id: string;
  addon_id: string;
  addon_option_id: string;
  option_name: string;
  option_price: number;
}

interface CartItem {
  id: string;
  menu_item_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  notes: string | null;
  addons: CartAddon[];
}

interface CartResponse {
  cart: {
    id: string;
    merchant_id: string;
    merchant?: { name: string; slug: string } | null;
    items: CartItem[];
    subtotal: number;
  };
}

export function CartScreen() {
  const navigation = useNavigation<Navigation>();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<CartResponse>({
    queryKey: ['cart'],
    queryFn: async () => {
      const api = getApiClient();
      return api.get<CartResponse>('/cart');
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const api = getApiClient();
      await api.request<{ success: boolean }>(`/cart/items/${id}`, {
        method: 'PUT',
        body: { quantity },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const api = getApiClient();
      await api.request<{ success: boolean }>(`/cart/items/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      const api = getApiClient();
      await api.request<{ success: boolean }>('/cart', { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const cart = data?.cart;

  if (isLoading) return <LoadingIndicator label="Memuat keranjang..." />;
  if (isError) return <ErrorState message="Gagal memuat keranjang" onRetry={() => refetch()} />;

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        title="Keranjang Kosong"
        description="Yuk mulai pesan makanan favoritmu!"
        icon={<Text style={styles.emptyIcon}>🛒</Text>}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {cart.merchant ? (
          <Text style={styles.merchantName}>{cart.merchant.name}</Text>
        ) : null}

        {cart.items.map((item) => {
          const addonTotal = item.addons.reduce((sum, a) => sum + a.option_price, 0);
          const itemTotal = (item.unit_price * item.quantity) + addonTotal;

          return (
            <Card key={item.id} style={styles.itemCard} variant="default">
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name || 'Item'}</Text>
                  {item.addons.length > 0 ? (
                    <Text style={styles.addonsText}>
                      {item.addons.map((a) => a.option_name).join(', ')}
                    </Text>
                  ) : null}
                  <View style={styles.itemBottomRow}>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() =>
                          updateItem.mutate({
                            id: item.id,
                            quantity: Math.max(1, item.quantity - 1),
                          })
                        }
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() =>
                          updateItem.mutate({
                            id: item.id,
                            quantity: Math.min(20, item.quantity + 1),
                          })
                        }
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Price amount={itemTotal} size="body" />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => {
                    Alert.alert('Hapus Item?', 'Item akan dihapus dari keranjang.', [
                      { text: 'Batal', style: 'cancel' },
                      { text: 'Hapus', style: 'destructive', onPress: () => removeItem.mutate(item.id) },
                    ]);
                  }}
                >
                  <Text style={styles.removeBtnText}>×</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Price amount={cart.subtotal} size="body" />
          </View>
        </Card>

        <TouchableOpacity onPress={() => clearCart.mutate()}>
          <Text style={styles.clearText}>Kosongkan Keranjang</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Price amount={cart.subtotal} size="title" color={brand.primary} />
        </View>
        <Button
          label="Checkout"
          size="md"
          onPress={() => navigation.navigate('Checkout')}
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
  merchantName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  itemCard: {
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  addonsText: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  qtyValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    marginHorizontal: spacing.sm,
  },
  removeBtn: {
    marginLeft: spacing.sm,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 24,
    color: colors.neutral[400],
  },
  summaryCard: {
    marginTop: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.neutral[600],
  },
  clearText: {
    textAlign: 'center',
    color: colors.danger.DEFAULT,
    marginTop: spacing.md,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  totalLabel: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  emptyIcon: {
    fontSize: 48,
  },
});