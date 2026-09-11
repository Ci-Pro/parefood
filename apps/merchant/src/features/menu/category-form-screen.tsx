import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '@parefood/design-system/react-native';
import { brand, colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

type Route = RouteProp<Record<string, unknown>, string>;

interface CategoryRoute {
  category?: {
    id: string;
    name: string;
    description?: string;
  };
}

export function CategoryFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();

  const params = (route.params || {}) as CategoryRoute;
  const category = params.category;
  const isEditing = Boolean(category);

  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Nama kategori wajib diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const api = getApiClient();
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
      };

      if (isEditing && category) {
        await api.put(`/my/menu/categories/${category.id}`, body);
      } else {
        await api.post('/my/menu/categories', body);
      }

      queryClient.invalidateQueries({ queryKey: ['merchant', 'menu', 'categories'] });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan kategori');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{isEditing ? 'Ubah Kategori' : 'Tambah Kategori'}</Text>

          <Input
            label="Nama Kategori"
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Makanan, Minuman, Nasi"
          />

          <Input
            label="Deskripsi (Opsional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Keterangan singkat"
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={isEditing ? 'Simpan Perubahan' : 'Tambah Kategori'}
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
    marginBottom: spacing.lg,
  },
  error: {
    color: colors.danger.DEFAULT,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
});