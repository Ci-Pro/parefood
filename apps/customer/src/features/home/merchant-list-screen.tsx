import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Card,
  Avatar,
  Badge,
  Price,
  LoadingIndicator,
  ErrorState,
  EmptyState,
} from '@parefood/design-system/react-native';
import { brand, colors, spacing, typography } from '@parefood/design-system';
import { API_ENDPOINTS } from '@parefood/constants';
import { getApiClient } from '@parefood/api-client';
import type { Merchant } from '@parefood/types';

type Navigation = NativeStackNavigationProp<Record<string, unknown>>;

interface MerchantItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_open: boolean;
  min_order: number;
  rating: number;
  rating_count: number;
}

export default function MerchantListScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['merchants', 'list'],
    queryFn: async () => {
      const api = getApiClient();
      const response = await api.get<{ merchants: MerchantItem[] }>(
        API_ENDPOINTS.merchants.list,
        search ? { search } : undefined
      );
      return response.merchants || [];
    },
  });

  const merchants = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    return data.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari merchant..."
          placeholderTextColor={colors.neutral[400]}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <LoadingIndicator label="Memuat merchant..." />
      ) : isError ? (
        <ErrorState message="Gagal memuat data" onRetry={() => refetch()} />
      ) : merchants.length === 0 ? (
        <EmptyState title="Tidak ada merchant" description="Coba kata kunci lain" />
      ) : (
        <FlatList
          data={merchants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card
              style={styles.card}
              onPress={() =>
                navigation.navigate('MerchantDetail' as never, {
                  merchantId: item.id,
                  slug: item.slug,
                } as never)
              }
            >
              <View style={styles.row}>
                <Avatar name={item.name} size="lg" />
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.is_open ? (
                      <Badge label="Buka" variant="success" small />
                    ) : (
                      <Badge label="Tutup" variant="neutral" small />
                    )}
                  </View>
                  <Text style={styles.desc} numberOfLines={1}>
                    {item.description || 'Merchant PareFood'}
                  </Text>
                  <Text style={styles.meta}>
                    ⭐ {Number(item.rating || 0).toFixed(1)} · #{item.rating_count || 0} ·{' '}
                    <Price amount={Number(item.min_order || 0)} size="caption" />
                  </Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  searchWrap: {
    padding: spacing.md,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    fontSize: 15,
  },
  list: {
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    flex: 1,
  },
  desc: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: colors.neutral[600],
    marginTop: 4,
  },
});