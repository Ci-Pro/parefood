import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '@parefood/design-system/react-native';
import { brand, colors, spacing, radius } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

type Navigation = NativeStackNavigationProp<Record<string, unknown>>;

const VEHICLES = [
  { key: 'motorcycle', label: '🏍️ Motor' },
  { key: 'car', label: '🚗 Mobil' },
  { key: 'bicycle', label: '🚲 Sepeda' },
];

export default function DriverApplyScreen() {
  const navigation = useNavigation<Navigation>();
  const queryClient = useQueryClient();
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!vehiclePlate.trim()) {
      setError('Plat nomor wajib diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const api = getApiClient();
      await api.post('/my/driver/apply', {
        vehicle_type: vehicleType,
        vehicle_plate: vehiclePlate.trim(),
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['driver', 'mine'] });
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
          <Text style={styles.title}>Daftar Kurir</Text>
          <Text style={styles.subtitle}>
            Pengajuan akan ditinjau oleh tim PareFood sebelum Anda bisa menerima pesanan.
          </Text>

          <Text style={styles.sectionLabel}>Kendaraan</Text>
          <View style={styles.vehicleRow}>
            {VEHICLES.map((v) => (
              <TouchableOpacity
                key={v.key}
                style={[
                  styles.vehicleOption,
                  vehicleType === v.key && styles.vehicleOptionSelected,
                ]}
                onPress={() => setVehicleType(v.key)}
              >
                <Text
                  style={[
                    styles.vehicleText,
                    vehicleType === v.key && styles.vehicleTextSelected,
                  ]}
                >
                  {v.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Plat Nomor"
            value={vehiclePlate}
            onChangeText={setVehiclePlate}
            placeholder="Contoh: AG 1234 ABC"
            autoCapitalize="characters"
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing.sm,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  vehicleOption: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  vehicleOptionSelected: {
    borderColor: brand.primary,
    backgroundColor: '#ECFDF5',
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[600],
  },
  vehicleTextSelected: {
    color: brand.primary,
    fontWeight: '700',
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