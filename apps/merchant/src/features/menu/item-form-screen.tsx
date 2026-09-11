import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card, LoadingIndicator, ErrorState } from '@parefood/design-system/react-native';
import { brand, colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type Route = RouteProp<Record<string, unknown>, string>;

interface CategoryRow {
  id: string;
  name: string;
}

interface VariantForm {
  name: string;
  price: string;
  is_default: boolean;
}

interface ItemRoute {
  itemId?: string;
}

interface MerchantMenuDetail {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  old_price?: number;
  preparation_time_minutes?: number;
  variants?: Array<{ id: string; name: string; price: number; is_default: boolean }>;
}

export function ItemFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();

  const params = (route.params || {}) as ItemRoute;
  const itemId = params.itemId;
  const isEditing = Boolean(itemId);

  const categoriesQuery = useQuery({
    queryKey: ['merchant', 'menu', 'categories'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ categories: CategoryRow[] }>('/my/menu/categories');
      return res.categories;
    },
  });

  const itemQuery = useQuery({
    queryKey: ['merchant', 'menu', 'items', itemId],
    enabled: Boolean(itemId),
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ item: MerchantMenuDetail }>(`/my/menu/items/${itemId}`);
      return res.item;
    },
  });

  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const item = itemQuery.data;

  useEffect(() => {
    if (!item) return;
    setCategoryId(item.category_id || '');
    setName(item.name || '');
    setDescription(item.description || '');
    setPrice(String(item.price || ''));
    setOldPrice(item.old_price ? String(item.old_price) : '');
    setPrepTime(item.preparation_time_minutes ? String(item.preparation_time_minutes) : '');
    setVariants(
      (item.variants || []).map((v) => ({
        name: v.name || '',
        price: String(v.price || ''),
        is_default: Boolean(v.is_default),
      }))
    );
  }, [item]);

  const addVariant = () => {
    setVariants((prev) => [...prev, { name: '', price: '', is_default: prev.length === 0 }]);
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, patch: Partial<VariantForm>) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const handleSubmit = async () => {
    if (!categoryId) {
      setError('Pilih kategori');
      return;
    }
    if (!name.trim()) {
      setError('Nama item wajib diisi');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Harga wajib diisi dengan benar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const api = getApiClient();
      const base = {
        category_id: categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum,
        old_price: oldPrice ? parseFloat(oldPrice) : undefined,
        preparation_time_minutes: prepTime ? parseInt(prepTime, 10) : undefined,
      };

      if (isEditing && itemId) {
        await api.put(`/my/menu/items/${itemId}`, base);
      } else {
        const cleanVariants = variants
          .filter((v) => v.name.trim())
          .map((v) => ({
            name: v.name.trim(),
            price: parseFloat(v.price) || 0,
            is_default: v.is_default,
          }));
        await api.post('/my/menu/items', { ...base, variants: cleanVariants });
      }

      queryClient.invalidateQueries({ queryKey: ['merchant', 'menu', 'items'] });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan item');
    } finally {
      setLoading(false);
    }
  };

  if (categoriesQuery.isLoading || (isEditing && itemQuery.isLoading)) {
    return <LoadingIndicator label="Memuat..." />;
  }

  if (isEditing && itemQuery.error) {
    return <ErrorState message="Gagal memuat item." onRetry={() => itemQuery.refetch()} />;
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{isEditing ? 'Ubah Menu Item' : 'Tambah Menu Item'}</Text>

          <Text style={styles.label}>Kategori</Text>
          <View style={styles.catRow}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.catChip, categoryId === c.id && styles.catChipActive]}
                onPress={() => setCategoryId(c.id)}
              >
                <Text style={[styles.catChipText, categoryId === c.id && styles.catChipTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Nama Item" value={name} onChangeText={setName} placeholder="Contoh: Nasi Goreng" />
          <Input
            label="Deskripsi"
            value={description}
            onChangeText={setDescription}
            placeholder="Bahan dan keterangan"
            multiline
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Input
                label="Harga (Rp)"
                value={price}
                onChangeText={setPrice}
                keyboardType="number-pad"
                placeholder="15000"
              />
            </View>
            <View style={styles.rowItem}>
              <Input
                label="Harga Lama (Rp)"
                value={oldPrice}
                onChangeText={setOldPrice}
                keyboardType="number-pad"
                placeholder="Opsional"
              />
            </View>
          </View>

          <Input
            label="Waktu Siap (menit)"
            value={prepTime}
            onChangeText={setPrepTime}
            keyboardType="number-pad"
            placeholder="Opsional, misal 15"
          />

          {isEditing ? (
            item && item.variants && item.variants.length > 0 ? (
              <Card>
                <Text style={styles.cardTitle}>Varian Tersimpan</Text>
                {(item.variants as Array<{ name: string; price: number; is_default: boolean }>).map((v) => (
                  <View key={v.name} style={styles.variantRow}>
                    <Text style={styles.variantName}>{v.name}</Text>
                    <Text style={styles.variantPrice}>
                      {new Intl.NumberFormat('id-ID').format(v.price || 0)}
                    </Text>
                  </View>
                ))}
                <Text style={styles.hint}>Varian hanya bisa diubah saat membuat item baru di rilis ini.</Text>
              </Card>
            ) : null
          ) : (
            <Card>
              <Text style={styles.cardTitle}>Varian (Opsional)</Text>
              {variants.map((v, index) => (
                <View key={index} style={styles.variantRow}>
                  <TextInput
                    style={styles.variantInput}
                    value={v.name}
                    onChangeText={(val) => updateVariant(index, { name: val })}
                    placeholder="Nama varian"
                  />
                  <TextInput
                    style={styles.variantInput}
                    value={v.price}
                    onChangeText={(val) => updateVariant(index, { price: val })}
                    placeholder="Harga"
                    keyboardType="number-pad"
                  />
                  {index > 0 ? (
                    <TouchableOpacity onPress={() => removeVariant(index)}>
                      <Text style={styles.removeVariant}>Hapus</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              <TouchableOpacity onPress={addVariant}>
                <Text style={styles.addVariant}>+ Tambah Varian</Text>
              </TouchableOpacity>
              {item && item.variants && item.variants.length > 0 ? (
                <Text style={styles.hint}>Varian hanya disimpan saat item baru dibuat.</Text>
              ) : null}
            </Card>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={isEditing ? 'Simpan Perubahan' : 'Tambah Item'}
            size="lg"
            loading={loading}
            fullWidth
            onPress={handleSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral[50] },
  container: {
    padding: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  catChipActive: {
    backgroundColor: brand.primary,
    borderColor: brand.primary,
  },
  catChipText: {
    fontSize: 14,
    color: colors.neutral[600],
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rowItem: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  variantInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    color: colors.neutral[900],
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  variantName: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral[900],
  },
  variantPrice: {
    fontSize: 15,
    color: brand.primary,
    fontWeight: '600',
  },
  addVariant: {
    color: brand.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  removeVariant: {
    color: colors.danger.DEFAULT,
    fontWeight: '600',
    fontSize: 13,
  },
  hint: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: spacing.sm,
  },
  error: {
    color: colors.danger.DEFAULT,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
});