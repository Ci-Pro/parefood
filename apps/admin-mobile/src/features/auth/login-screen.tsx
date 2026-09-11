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

export function LoginScreen() {
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('admin@parefood.id');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Email dan kata sandi wajib diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const api = getApiClient();
      const response = await api.post<{
        token: string;
        user: AuthUser;
      }>(API_ENDPOINTS.auth.login, { email: email.trim(), password });

      setAuth(response.token, response.user);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal masuk';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>P</Text>
            </View>
            <Text style={styles.brand}>PareFood Admin</Text>
            <Text style={styles.tagline}>Operasional platform untuk staf internal</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Masuk</Text>

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
              placeholder="••••••••"
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label={loading ? 'Memproses...' : 'Masuk'}
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleLogin}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: spacing.xl,
    paddingTop: spacing.xxl || 48,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral[900],
  },
  tagline: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  error: {
    fontSize: 13,
    color: colors.danger.DEFAULT,
    marginBottom: spacing.sm,
  },
});