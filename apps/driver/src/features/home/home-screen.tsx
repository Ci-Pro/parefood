import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Switch,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Badge,
  Input,
  LoadingIndicator,
  EmptyState,
  ErrorState,
} from '@parefood/design-system/react-native';
import { brand, colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Navigation = NativeStackNavigationProp<Record<string, unknown>>;

interface DriverRow {
  id: string;
  status: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  current_latitude?: number;
  current_longitude?: number;
  total_deliveries: number;
  rating?: number;
  rating_count: number;
}

const STATUS_LABELS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  pending: { label: 'Menunggu Persetujuan', tone: 'warning' },
  approved: { label: 'Offline', tone: 'neutral' },
  online: { label: 'Online', tone: 'success' },
  offline: { label: 'Offline', tone: 'neutral' },
  rejected: { label: 'Ditolak', tone: 'danger' },
  suspended: { label: 'Ditangguhkan', tone: 'danger' },
};

const VEHICLE_LABEL: Record<string, string> = {
  motorcycle: 'Motor',
  car: 'Mobil',
  bicycle: 'Sepeda',
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const queryClient = useQueryClient();
  const [toggling, setToggling] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationMsg, setLocationMsg] = useState('');

  const driverQuery = useQuery({
    queryKey: ['driver', 'mine'],
    queryFn: async () => {
      const api = getApiClient();
      try {
        const res = await api.get<{ driver: DriverRow }>('/my/driver');
        return res.driver;
      } catch (e) {
        const anyError = e as { code?: number };
        if (anyError.code === 404) return null;
        throw e;
      }
    },
  });

  const activeCountQuery = useQuery({
    queryKey: ['driver', 'active', 'count'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ deliveries: Array<{ status: string }> }>('/driver/mine', {
        size: '200',
      });
      return res.deliveries.filter(
        (d) => ['ACCEPTED', 'PICKING_UP', 'PICKED_UP', 'ON_DELIVERY'].indexOf(d.status) !== -1
      ).length;
    },
  });

  if (driverQuery.isLoading) {
    return <LoadingIndicator label="Memuat profil..." />;
  }

  const driver = driverQuery.data;

  if (!driver) {
    return (
      <SafeAreaView style={styles.flex} edges={['top']}>
        <EmptyState
          icon={<Text style={styles.bigIcon}>🛵</Text>}
          title="Belum Daftar Kurir"
          description="Daftarkan diri Anda sebagai kurir PareFood untuk mulai menerima pesanan."
          action={
            <Button label="Daftar Kurir" onPress={() => navigation.navigate('DriverApply' as never)} />
          }
        />
      </SafeAreaView>
    );
  }

  if (driver.status === 'pending') {
    return (
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.container}>
          <Card>
            <View style={styles.approvalCard}>
              <Text style={styles.approvalIcon}>⏳</Text>
              <Text style={styles.approvalTitle}>Menunggu Persetujuan</Text>
              <Text style={styles.approvalBody}>
                Pengajuan kurir Anda sedang ditinjau oleh tim PareFood. Anda akan segera bisa
                menerima pesanan setelah disetujui.
              </Text>
              <Badge label={`${VEHICLE_LABEL[driver.vehicle_type || ''] || 'Kendaraan'} · ${driver.vehicle_plate || '-'}`} variant="info" />
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (driver.status === 'rejected' || driver.status === 'suspended') {
    return (
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ErrorState
          title="Akun Tidak Aktif"
          message="Pengajuan Anda belum disetujui. Silakan hubungi tim PareFood untuk info lebih lanjut."
        />
      </SafeAreaView>
    );
  }

  const statusInfo = STATUS_LABELS[driver.status] || STATUS_LABELS.offline;

  const handleToggleOnline = async (nextValue: boolean) => {
    setToggling(true);
    try {
      const api = getApiClient();
      await api.put('/driver/status', { status: nextValue ? 'online' : 'offline' });
      queryClient.invalidateQueries({ queryKey: ['driver', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['driver'] });
    } finally {
      setToggling(false);
    }
  };

  const handleUpdateLocation = async () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      setLocationMsg('Masukkan latitude & longitude yang valid');
      return;
    }

    setSendingLocation(true);
    setLocationMsg('');
    try {
      const api = getApiClient();
      await api.put('/driver/location', { latitude: lat, longitude: lng });
      queryClient.invalidateQueries({ queryKey: ['driver', 'mine'] });
      setLocationMsg('Lokasi diperbarui');
      setLatitude('');
      setLongitude('');
    } catch (e) {
      setLocationMsg(e instanceof Error ? e.message : 'Gagal memperbarui lokasi');
    } finally {
      setSendingLocation(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={driverQuery.isFetching}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ['driver'] });
            }}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Selamat datang 👋</Text>
          <Text style={styles.storeName}>
            {VEHICLE_LABEL[driver.vehicle_type || ''] || 'Driver'} · {driver.vehicle_plate || '-'}
          </Text>
          <Text style={styles.storeAddress}>PareFood Driver</Text>
        </View>

        <Card>
          <View style={styles.openRow}>
            <View style={styles.flex}>
              <Text style={styles.openTitle}>Terima Pesanan Antar</Text>
              <Text style={styles.openSubtitle}>
                {driver.status === 'online' ? 'Anda online' : 'Anda offline'}
              </Text>
            </View>
            <Switch
              value={driver.status === 'online'}
              disabled={toggling}
              onValueChange={handleToggleOnline}
              trackColor={{ false: colors.neutral[300], true: brand.primary }}
            />
          </View>
          <View style={styles.openMeta}>
            <Badge label={statusInfo.label} variant={statusInfo.tone} />
            <Text style={styles.minOrder}>Tugas aktif: {activeCountQuery.data ?? 0}</Text>
          </View>
        </Card>

        <View style={styles.statsRow}>
          <StatCard label="Pengantaran" value={String(driver.total_deliveries)} />
          <StatCard
            label="Rating"
            value={driver.rating_count ? driver.rating?.toFixed(1) ?? '0.0' : 'Baru'}
          />
        </View>

        <Text style={styles.sectionTitle}>Update Lokasi</Text>
        <Card>
          <View style={styles.locationRow}>
            <View style={styles.locationItem}>
              <Input
                value={latitude}
                onChangeText={setLatitude}
                placeholder="Latitude"
                keyboardType="decimal-pad"
                style={{ marginBottom: 0 }}
              />
            </View>
            <View style={styles.locationItem}>
              <Input
                value={longitude}
                onChangeText={setLongitude}
                placeholder="Longitude"
                keyboardType="decimal-pad"
                style={{ marginBottom: 0 }}
              />
            </View>
          </View>
          {locationMsg ? <Text style={styles.locationMsg}>{locationMsg}</Text> : null}
          <View style={styles.spacer} />
          <Button
            label={sendingLocation ? 'Menyimpan...' : 'Perbarui Lokasi'}
            variant="secondary"
            fullWidth
            loading={sendingLocation}
            disabled={!latitude || !longitude}
            onPress={handleUpdateLocation}
          />
        </Card>

        <View style={styles.spacer} />
        <Button
          label="Lihat Tugas"
          fullWidth
          onPress={() => navigation.navigate('Main' as never)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  container: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 15,
    color: colors.neutral[500],
  },
  storeName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: spacing.xs,
  },
  storeAddress: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  openTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  openSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },
  openMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  minOrder: {
    fontSize: 13,
    color: colors.neutral[600],
  },
  statsRow: {
    flexDirection: 'row',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: brand.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  locationItem: {
    flex: 1,
  },
  locationMsg: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: spacing.sm,
  },
  approvalCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  approvalIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  approvalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  approvalBody: {
    fontSize: 14,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  bigIcon: {
    fontSize: 40,
  },
  spacer: {
    height: spacing.sm,
  },
});