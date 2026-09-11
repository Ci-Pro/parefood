import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '@parefood/design-system/react-native';
import { brand, colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

type Navigation = NativeStackNavigationProp<Record<string, unknown>>;

export default function StoreApplyScreen() {
  const navigation = useNavigation<Navigation>();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !address.trim() || !phone.trim()) {
      setError('Nama toko, alamat, dan telepon wajib diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const api = getApiClient();
      await api.post('/my/merchant/apply', {
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim(),
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        phone: phone.trim(),
      });

      queryClient.invalidateQueries({ queryKey: ['merchant', 'mine'] });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim pengajuan');
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
          <Text style={styles.title}>Daftarkan Toko</Text>
          <Text style={styles.subtitle}>
            Pengajuan akan ditinjau oleh tim PareFood sebelum toko bisa menerima pesanan.
          </Text>

          <Input
            label="Nama Toko"
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Warung Bu Siti"
          />

          <Input
            label="Deskripsi"
            value={description}
            onChangeText={setDescription}
            placeholder="Sekilas tentang toko Anda"
            multiline
          />

          <Input
            label="Alamat"
            value={address}
            onChangeText={setAddress}
            placeholder="Alamat lengkap toko"
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Input
                label="Latitude"
                value={latitude}
                onChangeText={setLatitude}
                placeholder="-7.7548"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.rowItem}>
              <Input
                label="Longitude"
                value={longitude}
                onChangeText={setLongitude}
                placeholder="112.1234"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Input
            label="Nomor Telepon"
            value={phone}
            onChangeText={setPhone}
            placeholder="08xxxxxxxxxx"
            keyboardType="phone-pad"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Kirim Pengajuan"
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.neutral[500],
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rowItem: {
    flex: 1,
  },
  error: {
    color: colors.danger.DEFAULT,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
});