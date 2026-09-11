import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Card,
  Avatar,
  Button,
  Input,
  LoadingIndicator,
  ErrorState,
} from '@parefood/design-system/react-native';
import { brand, colors, spacing, radius } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';
import { useAuthStore } from '../auth/use-auth-store';

type Navigation = NativeStackNavigationProp<Record<string, unknown>>;

interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role?: string;
  avatar_url?: string | null;
}

export function ProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  const { data, isLoading, isError, refetch } = useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<{ profile: Profile }>('/profiles/me');
      return res.profile;
    },
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isEdit, setIsEdit] = useState(false);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const api = getApiClient();
      await api.put('/profiles/me', {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setIsEdit(false);
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const profile = data;

  const startEdit = (p: Profile) => {
    setName(p.name || '');
    setPhone(p.phone || '');
    setIsEdit(true);
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (isLoading) return <LoadingIndicator label="Memuat profil..." />;
  if (isError || !profile)
    return <ErrorState message="Gagal memuat profil" onRetry={() => refetch()} />;

  const roleLabel =
    (profile.role || '').replace('_', ' ').charAt(0).toUpperCase() +
    (profile.role || '').replace('_', ' ').slice(1);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        {!isEdit ? (
          <Card style={styles.profileCard}>
            <View style={styles.profileTop}>
              <Avatar size="xl" name={profile.name} uri={profile.avatar_url || undefined} />
              <View style={styles.profileText}>
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.email}>{profile.email}</Text>
                <Text style={styles.phone}>{profile.phone || 'Belum ada nomor HP'}</Text>
              </View>
            </View>
            <Button
              label="Edit Profil"
              size="sm"
              variant="outline"
              onPress={() => startEdit(profile)}
            />
          </Card>
        ) : (
          <Card style={styles.profileCard}>
            <Input
              label="Nama"
              value={name}
              onChangeText={setName}
              placeholder="Nama lengkap"
            />
            <Input
              label="Nomor HP"
              value={phone}
              onChangeText={setPhone}
              placeholder="08xxxxxxxxxx"
              keyboardType="phone-pad"
            />
            <View style={styles.editActions}>
              <Button
                label="Simpan"
                size="sm"
                loading={saveProfile.isPending}
                disabled={!name.trim()}
                onPress={() => saveProfile.mutate()}
              />
              <Button
                label="Batal"
                size="sm"
                variant="outline"
                onPress={() => setIsEdit(false)}
              />
            </View>
          </Card>
        )}

        {/* Menu */}
        <Text style={styles.sectionTitle}>Akun</Text>
        <Card>
          <MenuItem
            icon="👤"
            label={roleLabel}
            onPress={() => alert(`Role akun anda: ${roleLabel}`)}
          />
          <Divider />
          <MenuItem
            icon="📍"
            label="Alamat Pengantaran"
            onPress={() => navigation.navigate('Addresses' as never)}
          />
          <Divider />
          <MenuItem
            icon="⭐"
            label="Bantuan & Dukungan"
            onPress={() => alert('Fitur bantuan tersedia di pengembangan berikutnya')}
          />
          <Divider />
          <MenuItem
            icon="ℹ️"
            label="Tentang PareFood"
            onPress={() => alert('PareFood · Platform pesan antar makanan area Pare, Kediri')}
          />
        </Card>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuChevron}>›</Text>
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: brand.primary,
  },
  header: {
    padding: spacing.lg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 48,
  },
  profileCard: {
    marginBottom: spacing.md,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  email: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },
  phone: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + spacing.xs,
  },
  menuIcon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral[800],
  },
  menuChevron: {
    fontSize: 22,
    color: colors.neutral[300],
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
  },
  logoutBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger.light,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.danger.DEFAULT,
    fontWeight: '600',
    fontSize: 15,
  },
});