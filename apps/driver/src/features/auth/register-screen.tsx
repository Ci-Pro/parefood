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
import { API_ENDPOINTS } from '@parefood/constants';
import { getApiClient } from '@parefood/api-client';
import type { AuthUser } from '@parefood/types';
import { useAuthStore } from './use-auth-store';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Navigation = NativeStackNavigationProp<Record<string, unknown>>;

export function RegisterScreen() {
  const navigation = useNavigation<Navigation>();
  const { setAuth } = useAuthStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Semua field wajib diisi');
      return;
    }

    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const api = getApiClient();
      const response = await api.post<{
        token: string;
        user: AuthUser;
      }>(API_ENDPOINTS.auth.register('driver'), {
        name,
        email,
        password,
        phone: phone || undefined,
      });

      setAuth(response.token, response.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mendaftar');
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
          <Text style={styles.title}>Daftar Driver</Text>
          <Text style={styles.subtitle}>
            Buat akun kurir untuk mulai mengantar pesanan PareFood
          </Text>

          <Input
            label="Nama Lengkap"
            value={name}
            onChangeText={setName}
            placeholder="Nama Anda"
          />

          <Input
            label="Nomor Telepon"
            value={phone}
            onChangeText={setPhone}
            placeholder="08xxxxxxxxxx"
            keyboardType="phone-pad"
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="nama@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label="Kata Sandi"
            value={password}
            onChangeText={setPassword}
            placeholder="Minimal 8 karakter"
            secureTextEntry
          />

          <Input
            label="Konfirmasi Kata Sandi"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Ulangi kata sandi"
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Daftar"
            size="lg"
            loading={loading}
            fullWidth
            onPress={handleRegister}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Sudah punya akun? </Text>
            <Text
              style={styles.footerLink}
              onPress={() => navigation.goBack()}
            >
              Masuk
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral[50] },
  container: {
    flexGrow: 1,
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
  error: {
    color: colors.danger.DEFAULT,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.neutral[600],
  },
  footerLink: {
    color: brand.primary,
    fontWeight: '700',
  },
});