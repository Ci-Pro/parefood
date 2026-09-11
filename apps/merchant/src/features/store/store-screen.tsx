import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card, LoadingIndicator, ErrorState } from '@parefood/design-system/react-native';
import { brand, colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface MerchantRow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  status: string;
  is_open: boolean;
  min_order: number;
  hours?: MerchantHourRow[];
}

interface MerchantHourRow {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DEFAULT_HOURS: MerchantHourRow[] = Array.from({ length: 7 }, (_, i) => ({
  id: '',
  day_of_week: i,
  open_time: '08:00',
  close_time: '22:00',
  is_closed: i === 0,
}));

export default function StoreScreen() {
  const queryClient = useQueryClient();

  const merchantQuery = useQuery({
    queryKey: ['merchant', 'mine'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ merchant: MerchantRow }>('/my/merchant');
      return res.merchant;
    },
  });

  const merchant = merchantQuery.data;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [minOrder, setMinOrder] = useState('0');
  const [hours, setHours] = useState<MerchantHourRow[]>(DEFAULT_HOURS);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!merchant) return;
    setName(merchant.name || '');
    setDescription(merchant.description || '');
    setAddress(merchant.address || '');
    setPhone(merchant.phone || '');
    setMinOrder(String(merchant.min_order || 0));
    if (merchant.hours && merchant.hours.length) {
      const merged = DAY_NAMES.map((_, i) => {
        const existing = merchant.hours?.find((h) => h.day_of_week === i);
        return (
          existing || {
            id: '',
            day_of_week: i,
            open_time: '08:00',
            close_time: '22:00',
            is_closed: i === 0,
          }
        );
      });
      setHours(merged);
    }
  }, [merchant]);

  const updateHour = (index: number, patch: Partial<MerchantHourRow>) => {
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  };

  const handleSaveProfile = async () => {
    if (!name.trim() || !address.trim()) {
      setMessage('Nama toko dan alamat wajib diisi');
      return;
    }
    setSavingProfile(true);
    setMessage('');
    try {
      const api = getApiClient();
      await api.put('/my/merchant', {
        name: name.trim(),
        description: description || undefined,
        address: address.trim(),
        phone: phone || undefined,
        min_order: parseInt(minOrder, 10) || 0,
      });
      queryClient.invalidateQueries({ queryKey: ['merchant', 'mine'] });
      setMessage('Profil toko tersimpan');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal menyimpan profil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    setMessage('');
    try {
      const api = getApiClient();
      await api.put('/my/merchant/hours', {
        hours: hours.map((h) => ({
          id: h.id || undefined,
          day_of_week: h.day_of_week,
          open_time: h.open_time,
          close_time: h.close_time,
          is_closed: h.is_closed,
        })),
      });
      queryClient.invalidateQueries({ queryKey: ['merchant', 'mine'] });
      setMessage('Jam operasional tersimpan');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal menyimpan jam operasional');
    } finally {
      setSavingHours(false);
    }
  };

  if (merchantQuery.isLoading) {
    return <LoadingIndicator label="Memuat data toko..." />;
  }

  if (!merchant) {
    return (
      <ErrorState
        title="Toko Belum Terdaftar"
        message="Daftarkan toko Anda terlebih dahulu dari halaman Beranda."
      />
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Profil Toko</Text>

          <Card>
            <Input
              label="Nama Toko"
              value={name}
              onChangeText={setName}
              placeholder="Nama toko Anda"
            />
            <Input
              label="Deskripsi"
              value={description}
              onChangeText={setDescription}
              placeholder="Sekilas tentang toko"
              multiline
            />
            <Input
              label="Alamat"
              value={address}
              onChangeText={setAddress}
              placeholder="Alamat lengkap"
            />
            <Input
              label="Nomor Telepon"
              value={phone}
              onChangeText={setPhone}
              placeholder="08xxxxxxxxxx"
              keyboardType="phone-pad"
            />
            <Input
              label="Minimum Pesanan (Rp)"
              value={minOrder}
              onChangeText={setMinOrder}
              keyboardType="number-pad"
            />
            <Button
              label="Simpan Profil"
              loading={savingProfile}
              fullWidth
              onPress={handleSaveProfile}
            />
          </Card>

          <Text style={styles.sectionTitle}>Jam Operasional</Text>
          <Card>
            {hours.map((h, index) => (
              <View key={h.day_of_week} style={styles.hourRow}>
                <Text style={styles.dayLabel}>{DAY_NAMES[h.day_of_week]}</Text>
                <View style={styles.hourInputs}>
                  <TextInput
                    style={[styles.timeInput, !h.is_closed && { borderColor: colors.neutral[200], borderWidth: 1 }]}
                    value={h.open_time}
                    onChangeText={(v) => updateHour(index, { open_time: v })}
                    placeholder="08:00"
                    editable={!h.is_closed}
                  />
                  <Text style={styles.hourDash}>–</Text>
                  <TextInput
                    style={[styles.timeInput, !h.is_closed && { borderColor: colors.neutral[200], borderWidth: 1 }]}
                    value={h.close_time}
                    onChangeText={(v) => updateHour(index, { close_time: v })}
                    placeholder="22:00"
                    editable={!h.is_closed}
                  />
                  <Text
                    style={[styles.closedToggle, h.is_closed && styles.closedToggleOn]}
                    onPress={() => updateHour(index, { is_closed: !h.is_closed })}
                  >
                    {h.is_closed ? 'Tutup' : 'Buka'}
                  </Text>
                </View>
              </View>
            ))}
            <Button
              label="Simpan Jam Operasional"
              variant="secondary"
              loading={savingHours}
              fullWidth
              onPress={handleSaveHours}
            />
          </Card>

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral[50] },
  container: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[800],
    width: 72,
  },
  hourInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    fontSize: 15,
    color: colors.neutral[900],
    backgroundColor: '#FFFFFF',
  },
  hourDash: {
    color: colors.neutral[400],
  },
  closedToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
    color: colors.neutral[700],
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
  },
  closedToggleOn: {
    backgroundColor: colors.danger.light,
    color: colors.danger.DEFAULT,
  },
  message: {
    marginTop: spacing.md,
    color: brand.primary,
    fontSize: 14,
    textAlign: 'center',
  },
});