import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Price } from '@parefood/design-system/react-native';
import { brand, colors, spacing, typography } from '@parefood/design-system';
import { API_ENDPOINTS } from '@parefood/constants';
import { getApiClient } from '@parefood/api-client';
import type { AuthUser } from '@parefood/types';
import { useAuthStore } from './use-auth-store';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Navigation = NativeStackNavigationProp<Record<string, unknown>>;

export function LoginScreen() {
  const navigation = useNavigation<Navigation>();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('customer@parefood.id');
  const [password, setPassword] = useState('User@123456');
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
            <Text style={styles.brand}>PareFood</Text>
            <Text style={styles.tagline}>Pesan makan, sampai di depan pintu</Text>
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
              label="Masuk"
              size="lg"
              loading={loading}
              fullWidth
              onPress={handleLogin}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Belum punya akun? </Text>
            <Text
              style={styles.footerLink}
              onPress={() => navigation.navigate('Register' as never)}
            >
              Daftar Sekarang
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: brand.primary,
  },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    backgroundColor: brand.primary,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    color: brand.primary,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs,
  },
  form: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
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
    paddingVertical: spacing.lg,
    backgroundColor: colors.neutral[50],
  },
  footerText: {
    color: colors.neutral[600],
    fontSize: 14,
  },
  footerLink: {
    color: brand.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});