import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button, Price, Badge, LoadingIndicator, ErrorState } from '@parefood/design-system/react-native';
import { brand, colors, spacing, radius, typography } from '@parefood/design-system';
import { API_ENDPOINTS } from '@parefood/constants';
import { getApiClient } from '@parefood/api-client';
import type { MenuItem, MenuVariant, MenuAddon } from '@parefood/types';

type Navigation = { navigate: (s: string, p?: unknown) => void };

type Selections = Record<string, string>;

interface MenuItemDetail {
  id: string;
  name: string;
  description?: string;
  price: number;
  is_available: boolean;
  variants?: { id: string; name: string; price: number; is_available: boolean }[];
  addons?: {
    id: string;
    name: string;
    is_required: boolean;
    options: { id: string; name: string; price: number; is_available: boolean }[];
  }[];
}

export default function MenuDetailScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute();
  const params = route.params as { itemId: string; merchantId: string } | undefined;
  const itemId = params?.itemId || '';
  const merchantId = params?.merchantId || '';

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [addonSelections, setAddonSelections] = useState<Selections>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['menu-item', itemId],
    queryFn: async () => {
      const api = getApiClient();
      const response = await api.get<{ item: MenuItemDetail }>(
        `/my/menu/items/${itemId}`
      );
      return response.item;
    },
  });

  const item = data;

  // Calculate total price
  const variantPrice = item?.variants?.find((v) => v.id === selectedVariant)?.price || 0;
  let addonsTotal = 0;
  if (item?.addons) {
    item.addons.forEach((addon) => {
      const selected = addonSelections[addon.id];
      if (selected) {
        const option = addon.options.find((o) => o.id === selected);
        if (option) addonsTotal += option.price;
      }
    });
  }

  const unitTotal = (item ? Number(item.price) + variantPrice + addonsTotal : 0) * quantity;

  const handleAddToCart = async () => {
    if (!item) return;

    // Validate required addons
    if (item.addons?.some((a) => a.is_required && !addonSelections[a.id])) {
      alert('Silakan pilih addon yang wajib');
      return;
    }

    try {
      const api = getApiClient();
      const addons = Object.entries(addonSelections).map(([addonId, optionId]) => ({
        addon_id: addonId,
        option_id: optionId,
      }));

      await api.request(`/cart/items`, {
        method: 'POST',
        body: {
          menu_item_id: item.id,
          variant_id: selectedVariant || undefined,
          quantity,
          addons,
        },
      });

      navigation.navigate('Cart');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal menambahkan ke keranjang');
    }
  };

  if (isLoading) return <LoadingIndicator label="Memuat..." />;
  if (isError || !item) return <ErrorState message="Item tidak ditemukan" onRetry={() => refetch()} />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{item.name}</Text>
          <Price amount={Number(item.price)} size="title" color={brand.primary} />
        </View>

        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

        {/* Variants */}
        {item.variants?.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pilih Varian</Text>
            {item.variants.map((variant) => (
              <TouchableOpacity
                key={variant.id}
                style={[
                  styles.option,
                  selectedVariant === variant.id && styles.optionSelected,
                  !variant.is_available && styles.optionDisabled,
                ]}
                disabled={!variant.is_available}
                onPress={() => setSelectedVariant(selectedVariant === variant.id ? null : variant.id)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedVariant === variant.id && styles.optionTextSelected,
                  ]}
                >
                  {variant.name}
                </Text>
                {variant.price > 0 ? (
                  <Price amount={Number(variant.price)} size="caption" weight="medium" />
                ) : (
                  <Text style={styles.freeText}>Gratis</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Addons */}
        {item.addons?.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pilih Tambahan {item.addons.some((a) => a.is_required) ? '(Wajib)' : '(Opsional)'}
            </Text>
            {item.addons.map((addon) => (
              <View key={addon.id} style={styles.addonGroup}>
                <Text style={styles.addonTitle}>
                  {addon.name}{' '}
                  {addon.is_required ? (
                    <Text style={styles.requiredText}>· Wajib</Text>
                  ) : (
                    ''
                  )}
                </Text>
                {addon.options.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.option,
                      addonSelections[addon.id] === option.id && styles.optionSelected,
                      !option.is_available && styles.optionDisabled,
                    ]}
                    disabled={!option.is_available}
                    onPress={() =>
                      setAddonSelections((prev) => ({ ...prev, [addon.id]: option.id }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        addonSelections[addon.id] === option.id && styles.optionTextSelected,
                      ]}
                    >
                      {option.name}
                    </Text>
                    {Number(option.price) > 0 ? (
                      <Price amount={Number(option.price)} size="caption" weight="medium" />
                    ) : (
                      <Text style={styles.freeText}>Gratis</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* Quantity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jumlah</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => Math.min(20, q + 1))}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Price amount={unitTotal} size="title" color={brand.primary} />
        </View>
        <Button label="Tambah ke Keranjang" size="md" onPress={handleAddToCart} />
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
    padding: spacing.lg,
    paddingBottom: 120,
  },
  header: {
    marginBottom: spacing.md,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  desc: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    marginBottom: spacing.sm,
  },
  optionSelected: {
    borderColor: brand.primary,
    backgroundColor: '#ECFDF5',
  },
  optionDisabled: {
    opacity: 0.4,
  },
  optionText: {
    fontSize: 15,
    color: colors.neutral[800],
    fontWeight: '500',
  },
  optionTextSelected: {
    color: brand.primary,
    fontWeight: '700',
  },
  freeText: {
    fontSize: 13,
    color: colors.success.DEFAULT,
    fontWeight: '600',
  },
  addonGroup: {
    marginBottom: spacing.sm,
  },
  addonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  requiredText: {
    color: colors.danger.DEFAULT,
    fontSize: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  qtyValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginHorizontal: spacing.lg,
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
});