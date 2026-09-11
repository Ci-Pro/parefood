import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button, Input, Card } from '@parefood/design-system/react-native';
import { colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

type Navigation = { navigate: (s: string, p?: unknown) => void };

export default function ReviewFormScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute();
  const queryClient = useQueryClient();
  const params = route.params as { orderId?: string } | undefined;
  const orderId = params?.orderId || '';

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      const api = getApiClient();
      return api.post('/reviews', { order_id: orderId, rating, comment });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigation.navigate('OrderDetail', { orderId: orderId } as never);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      alert(err?.response?.data?.error?.message || err?.message || 'Gagal mengirim ulasan');
    },
  });

  const submitDisabled = rating === 0 || submit.isPending;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.ratingCard}>
        <Text style={styles.title}>Bagaimana pengalaman pesananmu?</Text>
        <Text style={styles.subtitle}>Pilih rating lalu tulis ulasan (opsional)</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setRating(s)} hitSlop={8}>
              <Text style={[styles.star, s <= rating && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Input
        label="Ulasan"
        placeholder="Ceritakan pengalamanmu..."
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        style={styles.commentInput}
      />

      <Button
        label={submit.isPending ? 'Mengirim...' : 'Kirim Ulasan'}
        size="lg"
        fullWidth
        loading={submit.isPending}
        disabled={submitDisabled}
        onPress={() => submit.mutate()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  content: {
    padding: spacing.md,
    paddingBottom: 48,
  },
  ratingCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  stars: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  star: {
    fontSize: 38,
    color: colors.neutral[300],
  },
  starActive: {
    color: '#F59E0B',
  },
  commentInput: {
    height: 120,
    paddingTop: spacing.md,
  },
});