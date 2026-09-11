import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, LoadingIndicator, ErrorState, Button, EmptyState, StatusBadge } from '@parefood/design-system/react-native';
import { colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

interface PendingMerchant {
  id: string;
  name: string;
  status: string;
  owner_id: string;
  created_at?: string;
}

interface PendingDriver {
  id: string;
  name?: string;
  is_verified?: boolean;
  is_approved?: boolean;
  status?: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}

type Section = 'merchants' | 'drivers' | 'users';

export default function ValidationScreen() {
  const queryClient = useQueryClient();
  const [section, setSection] = React.useState<Section>('merchants');

  const merchants = useQuery<{ merchants: PendingMerchant[] }>({
    queryKey: ['admin-merchants-pending'],
    queryFn: async () => {
      const api = getApiClient();
      return api.get<{ merchants: PendingMerchant[] }>('/admin/merchants/pending');
    },
  });

  const drivers = useQuery<{ drivers: PendingDriver[] }>({
    queryKey: ['admin-drivers-pending'],
    queryFn: async () => {
      const api = getApiClient();
      return api.get<{ drivers: PendingDriver[] }>('/admin/drivers/pending');
    },
  });

  const users = useQuery<{ users: AdminUser[] }>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const api = getApiClient();
      return api.get<{ users: AdminUser[] }>('/admin/users', { size: 50 });
    },
  });

  const approval = useMutation({
    mutationFn: async ({ route, id, action }: { route: string; id: string; action: string }) => {
      const api = getApiClient();
      return api.post(`/admin/${route}/${id}/${action}`, {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-merchants-pending'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-drivers-pending'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      alert(err?.response?.data?.error?.message || err?.message || 'Gagal memproses');
    },
  });

  const handleDecision = (route: string, id: string, action: 'approve' | 'reject', label: string, kind: string) => {
    Alert.alert(
      `${action === 'approve' ? 'Setujui' : 'Tolak'} ${kind}?`,
      `Yakin ingin ${action === 'approve' ? 'menyetujui' : 'menolak'} ${label}?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: action === 'approve' ? 'Setujui' : 'Tolak', style: action === 'reject' ? 'destructive' : 'default', onPress: () => approval.mutate({ route, id, action }) },
      ]
    );
  };

  const pendingMerchants = merchants.data?.merchants || [];
  const pendingDrivers = drivers.data?.drivers || [];
  const usersList = users.data?.users || [];

  const renderMerchants = () =>
    merchants.isLoading ? (
      <LoadingIndicator label="Memuat merchant..." />
    ) : merchants.isError ? (
      <ErrorState message="Gagal memuat merchant" onRetry={() => merchants.refetch()} />
    ) : pendingMerchants.length === 0 ? (
      <EmptyState title="Tidak ada merchant menunggu validasi" />
    ) : (
      pendingMerchants.map((m) => (
        <Card key={m.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{m.name}</Text>
              <StatusBadge status={m.status === 'PENDING' ? 'PENDING' : 'INACTIVE'} />
              <Text style={styles.dim}>Owner: {m.owner_id}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button label="Setujui" size="sm" style={styles.actionBtn} onPress={() => handleDecision('merchants', m.id, 'approve', m.name, 'merchant')} />
            <Button label="Tolak" size="sm" variant="danger" style={styles.actionBtn} onPress={() => handleDecision('merchants', m.id, 'reject', m.name, 'merchant')} />
          </View>
        </Card>
      ))
    );

  const renderDrivers = () =>
    drivers.isLoading ? (
      <LoadingIndicator label="Memuat kurir..." />
    ) : drivers.isError ? (
      <ErrorState message="Gagal memuat kurir" onRetry={() => drivers.refetch()} />
    ) : pendingDrivers.length === 0 ? (
      <EmptyState title="Tidak ada kurir menunggu validasi" />
    ) : (
      pendingDrivers.map((d) => (
        <Card key={d.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{d.name || d.id}</Text>
              <Text style={styles.dim}>Status: {d.status || '-'}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button label="Setujui" size="sm" style={styles.actionBtn} onPress={() => handleDecision('drivers', d.id, 'approve', d.name || d.id, 'kurir')} />
            <Button label="Tolak" size="sm" variant="danger" style={styles.actionBtn} onPress={() => handleDecision('drivers', d.id, 'reject', d.name || d.id, 'kurir')} />
          </View>
        </Card>
      ))
    );

  const renderUsers = () =>
    users.isLoading ? (
      <LoadingIndicator label="Memuat pengguna..." />
    ) : users.isError ? (
      <ErrorState message="Gagal memuat pengguna" onRetry={() => users.refetch()} />
    ) : usersList.length === 0 ? (
      <EmptyState title="Belum ada pengguna" />
    ) : (
      usersList.map((u) => (
        <Card key={u.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{u.name}</Text>
              <View style={styles.userMetaRow}>
                <StatusBadge status={u.is_active ? 'ACTIVE' : 'INACTIVE'} />
                <Text style={styles.roleChip}>{u.role}</Text>
              </View>
              <Text style={styles.dim}>{u.email}</Text>
            </View>
          </View>
        </Card>
      ))
    );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, section === 'merchants' && styles.tabActive]}
          onPress={() => setSection('merchants')}
        >
          <Text style={[styles.tabText, section === 'merchants' && styles.tabTextActive]}>
            Merchant ({pendingMerchants.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, section === 'drivers' && styles.tabActive]}
          onPress={() => setSection('drivers')}
        >
          <Text style={[styles.tabText, section === 'drivers' && styles.tabTextActive]}>
            Kurir ({pendingDrivers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, section === 'users' && styles.tabActive]}
          onPress={() => setSection('users')}
        >
          <Text style={[styles.tabText, section === 'users' && styles.tabTextActive]}>
            Pengguna ({usersList.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {section === 'merchants'
          ? renderMerchants()
          : section === 'drivers'
            ? renderDrivers()
            : renderUsers()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary[600],
  },
  tabText: {
    fontSize: 14,
    color: colors.neutral[600],
  },
  tabTextActive: {
    color: colors.primary[600],
    fontWeight: '700',
  },
  content: {
    padding: spacing.md,
    paddingBottom: 48,
  },
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  roleChip: {
    fontSize: 12,
    color: colors.neutral[600],
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dim: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});