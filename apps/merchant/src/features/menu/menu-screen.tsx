import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  LoadingIndicator,
  ErrorState,
  EmptyState,
} from '@parefood/design-system/react-native';
import { brand, colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatIDR } from '@parefood/utils';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Navigation = NativeStackNavigationProp<Record<string, unknown>>;

interface CategoryRow {
  id: string;
  merchant_id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

interface MenuItemRow {
  id: string;
  merchant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  old_price?: number;
  image_url?: string;
  is_available: boolean;
  is_featured: boolean;
  preparation_time_minutes?: number;
  sort_order: number;
  variants?: unknown[];
}

export default function MenuScreen() {
  const navigation = useNavigation<Navigation>();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['merchant', 'menu', 'categories'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ categories: CategoryRow[] }>('/my/menu/categories');
      return res.categories;
    },
  });

  const itemsQuery = useQuery({
    queryKey: ['merchant', 'menu', 'items'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ items: MenuItemRow[] }>('/my/menu/items', { size: '200' });
      return res.items;
    },
  });

  const categories = categoriesQuery.data ?? [];
  const allItems = itemsQuery.data ?? [];
  const items = selectedCategory
    ? allItems.filter((i) => i.category_id === selectedCategory)
    : allItems;

  const refreshing = categoriesQuery.isFetching || itemsQuery.isFetching;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['merchant', 'menu'] });
  };

  const toggleAvailability = async (item: MenuItemRow) => {
    try {
      const api = getApiClient();
      await api.put(`/my/menu/items/${item.id}/availability`, {
        is_available: !item.is_available,
      });
      queryClient.invalidateQueries({ queryKey: ['merchant', 'menu', 'items'] });
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Gagal mengubah ketersediaan');
    }
  };

  const removeItem = (item: MenuItemRow) => {
    Alert.alert('Hapus Item', `Hapus "${item.name}" dari menu?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            const api = getApiClient();
            await api.delete(`/my/menu/items/${item.id}`);
            queryClient.invalidateQueries({ queryKey: ['merchant', 'menu', 'items'] });
          } catch (e) {
            Alert.alert('Gagal', e instanceof Error ? e.message : 'Gagal menghapus item');
          }
        },
      },
    ]);
  };

  if (categoriesQuery.isLoading || itemsQuery.isLoading) {
    return <LoadingIndicator label="Memuat menu..." />;
  }

  if (categoriesQuery.error || itemsQuery.error) {
    return <ErrorState message="Gagal memuat menu. Periksa koneksi Anda." onRetry={refresh} />;
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu Toko</Text>
        <View style={styles.headerActions}>
          <Button
            label="+ Kategori"
            variant="outline"
            size="sm"
            onPress={() => navigation.navigate('CategoryForm' as never, {} as never)}
          />
          <Button
            label="+ Item"
            size="sm"
            onPress={() => navigation.navigate('ItemForm' as never, {} as never)}
          />
        </View>
      </View>

      <View style={styles.catRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catContent}>
          <TouchableOpacity
            style={[styles.catChip, selectedCategory === null && styles.catChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.catChipText, selectedCategory === null && styles.catChipTextActive]}>
              Semua
            </Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catChip, selectedCategory === c.id && styles.catChipActive]}
              onPress={() => setSelectedCategory(c.id)}
            >
              <Text style={[styles.catChipText, selectedCategory === c.id && styles.catChipTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Text style={styles.bigIcon}>🍽️</Text>}
            title="Menu Kosong"
            description="Tambahkan kategori dan menu item untuk toko Anda."
          />
        }
        renderItem={({ item }) => (
          <Card padding="md" style={styles.itemCard}>
            <View style={styles.itemTop}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{formatIDR(item.price)}</Text>
                {item.preparation_time_minutes ? (
                  <Text style={styles.itemPrep}>±{item.preparation_time_minutes} mnt</Text>
                ) : null}
              </View>
              <Switch
                value={item.is_available}
                onValueChange={() => toggleAvailability(item)}
                trackColor={{ false: colors.neutral[300], true: brand.primary }}
              />
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.itemActionBtn}
                onPress={() =>
                  navigation.navigate('ItemForm' as never, { itemId: item.id } as never)
                }
              >
                <Text style={styles.itemActionText}>Ubah</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.itemActionBtn}
                onPress={() => removeItem(item)}
              >
                <Text style={[styles.itemActionText, { color: colors.danger.DEFAULT }]}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  catRow: {
    marginBottom: spacing.sm,
  },
  catContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
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
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  itemPrice: {
    fontSize: 15,
    color: brand.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  itemPrep: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  itemActionBtn: {
    paddingVertical: spacing.xs,
  },
  itemActionText: {
    fontSize: 14,
    color: brand.primary,
    fontWeight: '600',
  },
  bigIcon: {
    fontSize: 40,
  },
});