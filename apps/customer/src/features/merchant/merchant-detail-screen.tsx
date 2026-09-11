import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Card,
  Badge,
  Price,
  Avatar,
  LoadingIndicator,
  ErrorState,
} from '@parefood/design-system/react-native';
import { brand, colors, spacing, radius } from '@parefood/design-system';
import { API_ENDPOINTS } from '@parefood/constants';
import { getApiClient } from '@parefood/api-client';
import type { Merchant, MenuCategory, MenuItem, MenuVariant } from '@parefood/types';

type Navigation = NativeStackNavigationProp<Record<string, unknown>>;

interface MerchantDetail {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_open: boolean;
  min_order: number;
  rating: number;
  rating_count: number;
  address?: string;
}

interface MenuItemRow {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id: string;
  is_available: boolean;
  variants: { id: string; name: string; price: number; is_available: boolean }[];
}

interface MenuCategoryRow {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

interface MenuResponse {
  categories: MenuCategoryRow[];
  items: MenuItemRow[];
}

interface ReviewRow {
  id: string;
  rating: number;
  comment?: string | null;
  admin_reply?: string | null;
  replied_at?: string | null;
  customer_name: string;
  created_at: string;
}

function ReviewsSection({ slug, rating, ratingCount }: { slug: string; rating: number; ratingCount: number }) {
  const { data } = useQuery({
    queryKey: ['reviews', slug],
    enabled: !!slug,
    queryFn: async () => {
      const api = getApiClient();
      const response = await api.get<{ reviews: ReviewRow[] }>(`/merchants/${slug}/reviews`);
      return response.reviews;
    },
  });

  const reviews = data || [];

  return (
    <View>
      <View style={styles.reviewsHeader}>
        <Text style={styles.reviewsTitle}>Ulasan</Text>
        <Text style={styles.reviewsRating}>
          ⭐ {Number(rating || 0).toFixed(1)} · {ratingCount || 0} ulasan
        </Text>
      </View>

      {reviews.length === 0 ? (
        <Text style={styles.noReviews}>Belum ada ulasan</Text>
      ) : (
        reviews.map((r) => (
          <Card key={r.id} style={styles.reviewCard}>
            <View style={styles.reviewTop}>
              <Text style={styles.reviewStars}>{'★'.repeat(Math.min(r.rating, 5))}</Text>
              <Text style={styles.reviewDate}>
                {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <Text style={styles.reviewName}>{r.customer_name}</Text>
            {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
            {r.admin_reply ? (
              <View style={styles.replyBox}>
                <Text style={styles.replyLabel}>Balasan merchant</Text>
                <Text style={styles.replyText}>{r.admin_reply}</Text>
              </View>
            ) : null}
          </Card>
        ))
      )}
    </View>
  );
}

export default function MerchantDetailScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute();
  const params = route.params as { merchantId?: string; slug?: string } | undefined;

  const merchantId = params?.merchantId || '';
  const slug = params?.slug || '';

  const { data: merchantData, isLoading } = useQuery({
    queryKey: ['merchant', merchantId || slug],
    queryFn: async () => {
      const api = getApiClient();
      const response = await api.get<{ merchant: MerchantDetail }>(
        `/merchants/${slug || merchantId}`
      );
      return response.merchant;
    },
  });

  const { data: menuData, isError, refetch } = useQuery({
    queryKey: ['menu', merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      const api = getApiClient();
      const response = await api.get<MenuResponse>(
        `/merchants/${merchantId}/menu`
      );
      return response;
    },
  });

  useEffect(() => {
    if (merchantData?.name) {
      navigation.setOptions({ title: merchantData.name });
    }
  }, [merchantData, navigation]);

  const merchant = merchantData;

  if (isLoading || (!merchantData && !slug)) {
    return <LoadingIndicator label="Memuat merchant..." />;
  }

  // Build sections for SectionList
  const sections = (menuData?.categories || [])
    .map((cat) => ({
      title: cat.name,
      data: (menuData?.items || []).filter((i) => i.category_id === cat.id),
    }))
    .filter((s) => s.data.length > 0);

  return (
    <View style={styles.container}>
      {!merchant ? (
        <ErrorState message="Merchant tidak ditemukan" onRetry={() => refetch()} />
      ) : (
        <SectionList
          sections={sections.length > 0 ? sections : []}
          keyExtractor={(item, index) => item.id || `${item.category_id}-${index}`}
          stickySectionHeadersEnabled
          ListHeaderComponent={
            <View>
              <View style={styles.banner}>
                <Text style={styles.bannerName}>{merchant.name}</Text>
                <Text style={styles.bannerDesc} numberOfLines={2}>
                  {merchant.description || 'Merchant PareFood'}
                </Text>
                <View style={styles.bannerRow}>
                  {merchant.is_open ? (
                    <Badge label="Buka" variant="success" small />
                  ) : (
                    <Badge label="Tutup" variant="neutral" small />
                  )}
                  <Text style={styles.bannerMeta}>
                    ⭐ {Number(merchant.rating || 0).toFixed(1)} ({merchant.rating_count || 0})
                  </Text>
                </View>
              </View>

              <Card style={styles.infoCard}>
                <Text style={styles.infoTitle}>Info Merchant</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Alamat:</Text>
                  <Text style={styles.infoValue}>{merchant.address}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pesan Minimum:</Text>
                  <Price amount={Number(merchant.min_order || 0)} size="caption" weight="semibold" />
                </View>
              </Card>

              {sections.length === 0 && !isLoading ? (
                <Text style={styles.noMenu}>Menu belum tersedia</Text>
              ) : null}
            </View>
          }
          ListFooterComponent={
            merchant.slug ? (
              <ReviewsSection
                slug={merchant.slug}
                rating={Number(merchant.rating || 0)}
                ratingCount={Number(merchant.rating_count || 0)}
              />
            ) : null
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('MenuDetail' as never, {
                  itemId: item.id,
                  merchantId,
                } as never)
              }
            >
              <Card style={styles.menuCard} variant="default">
                <View style={styles.menuCardRow}>
                  <View style={styles.menuInfo}>
                    <Text style={styles.menuName}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.menuDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                    <Text style={styles.menuPrice}>
                      Rp {Number(item.price).toLocaleString('id-ID')}
                    </Text>
                  </View>
                  <View style={styles.menuAction}>
                    {!item.is_available ? (
                      <Badge label="Habis" variant="neutral" small />
                    ) : (
                      <View style={styles.addButton}>
                        <Text style={styles.addButtonText}>+</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
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
  banner: {
    backgroundColor: brand.primary,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  bannerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  bannerMeta: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  infoCard: {
    margin: spacing.md,
    marginTop: -spacing.lg,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  infoLabel: {
    width: 110,
    fontSize: 13,
    color: colors.neutral[500],
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[800],
  },
  categoryHeader: {
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  menuCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  menuCardRow: {
    flexDirection: 'row',
  },
  menuInfo: {
    flex: 1,
  },
  menuName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  menuDesc: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  menuPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: brand.primary,
    marginTop: 6,
  },
  menuAction: {
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  noMenu: {
    textAlign: 'center',
    color: colors.neutral[500],
    padding: spacing.xl,
  },
  reviewsHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  reviewsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  reviewsRating: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  noReviews: {
    textAlign: 'center',
    color: colors.neutral[500],
    padding: spacing.lg,
  },
  reviewCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewStars: {
    fontSize: 14,
    color: '#F59E0B',
  },
  reviewDate: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
    marginTop: spacing.xs,
  },
  reviewComment: {
    fontSize: 13,
    color: colors.neutral[700],
    marginTop: spacing.xs,
  },
  replyBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.md,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral[500],
  },
  replyText: {
    fontSize: 13,
    color: colors.neutral[800],
    marginTop: 2,
  },
});