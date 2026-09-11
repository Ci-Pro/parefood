import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Card,
  Avatar,
  Price,
  Badge,
  LoadingIndicator,
  ErrorState,
} from '@parefood/design-system/react-native';
import { brand, colors, spacing, typography } from '@parefood/design-system';
import { API_ENDPOINTS } from '@parefood/constants';
import { getApiClient } from '@parefood/api-client';
import { useAuthStore } from '../auth/use-auth-store';

interface MerchantListItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  is_open: boolean;
  min_order: number;
  rating: number;
  rating_count: number;
}

type Navigation = NativeStackNavigationProp<Record<string, unknown>>;

export default function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuthStore();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      const api = getApiClient();
      const response = await api.get<{ merchants: MerchantListItem[] }>(
        API_ENDPOINTS.merchants.list
      );
      return response.merchants || [];
    },
  });

  const merchants = data || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              Halo, {user?.name?.split(' ')[0] || 'Pengguna'} 👋
            </Text>
            <Text style={styles.location}>
              Pare, Kab. Kediri — Jatim
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Merchants' as never)}
        >
          <Text style={styles.searchPlaceholder}>Cari makanan atau merchant</Text>
        </TouchableOpacity>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Kategori</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {['Makanan', 'Minuman', 'Kopi', 'Nasi', 'Mie', 'Dessert'].map((cat, i) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryItem, { backgroundColor: catColors[i % catColors.length] }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Merchants' as never)}
            >
              <Text style={styles.categoryEmoji}>{catEmojis[i % catEmojis.length]}</Text>
              <Text style={styles.categoryLabel}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Popular merchants */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Merchant Populer</Text>
          <Text style={styles.seeAll} onPress={() => navigation.navigate('Merchants' as never)}>
            Lihat Semua
          </Text>
        </View>

        {isLoading ? (
          <LoadingIndicator label="Memuat merchant..." />
        ) : isError ? (
          <ErrorState message="Gagal memuat data" onRetry={() => refetch()} />
        ) : merchants.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>Belum ada merchant yang tersedia</Text>
          </Card>
        ) : (
          <FlatList
            data={merchants}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.merchantList}
            renderItem={({ item }) => (
              <Card style={styles.merchantCard} onPress={() => navigation.navigate('MerchantDetail' as never, { merchantId: item.id, slug: item.slug } as never)}>
                <View style={styles.merchantRow}>
                  <Avatar name={item.name} size="lg" />
                  <View style={styles.merchantInfo}>
                    <View style={styles.merchantNameRow}>
                      <Text style={styles.merchantName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.is_open ? (
                        <Badge label="Buka" variant="success" small />
                      ) : (
                        <Badge label="Tutup" variant="neutral" small />
                      )}
                    </View>
                    <Text style={styles.merchantDesc} numberOfLines={1}>
                      {item.description || 'Merchant PareFood'}
                    </Text>
                    <Text style={styles.merchantMeta}>
                      ⭐ {Number(item.rating || 0).toFixed(1)} · {item.rating_count || 0} penilaian ·{' '}
                      <Price amount={Number(item.min_order || 0)} size="caption" />
                    </Text>
                  </View>
                </View>
              </Card>
            )}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const catColors = [
  '#ECFDF5',
  '#FEF3C7',
  '#FDF2F8',
  '#EFF6FF',
  '#FFEDD5',
  '#F5F3FF',
];
const catEmojis = ['🍜', '🥤', '☕', '🍚', '🍝', '🍰'];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: brand.primary,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: brand.primary,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  location: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  searchPlaceholder: {
    color: colors.neutral[400],
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: typography.sizes.title,
    fontWeight: '700',
    color: colors.neutral[900],
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: {
    color: brand.primary,
    fontSize: 14,
    fontWeight: '600',
    marginRight: spacing.lg,
  },
  catRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  categoryItem: {
    alignItems: 'center',
    padding: spacing.md,
    marginRight: spacing.sm,
    borderRadius: 16,
    minWidth: 72,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[700],
    marginTop: 4,
  },
  merchantList: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  merchantCard: {
    marginBottom: spacing.md,
  },
  merchantRow: {
    flexDirection: 'row',
  },
  merchantInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  merchantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    flex: 1,
  },
  merchantDesc: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  merchantMeta: {
    fontSize: 12,
    color: colors.neutral[600],
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.neutral[500],
    padding: spacing.lg,
  },
});