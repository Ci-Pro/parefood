import React, { useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { brand, colors, spacing } from '@parefood/design-system';
import { Button, LoadingIndicator } from '@parefood/design-system/react-native';
import { createApiClient, getApiClient } from '@parefood/api-client';
import { getApiConfig } from '@parefood/config';

import { useAuthStore } from './features/auth/use-auth-store';
import { LoginScreen } from './features/auth/login-screen';
import { RegisterScreen } from './features/auth/register-screen';
import HomeScreen from './features/home/home-screen';
import { OrdersScreen } from './features/orders/orders-screen';
import { OrderDetailScreen } from './features/orders/order-detail-screen';
import MenuScreen from './features/menu/menu-screen';
import { CategoryFormScreen } from './features/menu/category-form-screen';
import { ItemFormScreen } from './features/menu/item-form-screen';
import StoreScreen from './features/store/store-screen';
import StoreApplyScreen from './features/store/store-apply-screen';
import FinanceScreen from './features/finance/finance-screen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MERCHANT_ROLES = ['merchant_owner', 'merchant_staff'];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: brand.primary,
        tabBarInactiveTintColor: '#78716C',
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Beranda"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && { opacity: 1 }]}>🏪</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Pesanan"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && { opacity: 1 }]}>🧾</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && { opacity: 1 }]}>🍽️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Toko"
        component={StoreScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && { opacity: 1 }]}>⚙️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Keuangan"
        component={FinanceScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && { opacity: 1 }]}>💰</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AccessDeniedScreen() {
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return (
    <View style={styles.accessDenied}>
      <Text style={styles.accessDeniedTitle}>Akses Ditolak</Text>
      <Text style={styles.accessDeniedBody}>
        Aplikasi ini khusus untuk pemilik karyawan merchant PareFood.
      </Text>
      <Button label="Keluar" onPress={clearAuth} />
    </View>
  );
}

function RootNavigator() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();

  if (!isHydrated) {
    return <LoadingIndicator label="Memuat PareFood..." />;
  }

  const hasMerchantRole = isAuthenticated && user && MERCHANT_ROLES.indexOf(user.role) !== -1;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: brand.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Daftar Merchant' }} />
        </>
      ) : hasMerchantRole ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="StoreApply" component={StoreApplyScreen} options={{ title: 'Daftarkan Toko' }} />
          <Stack.Screen name="CategoryForm" component={CategoryFormScreen} options={{ title: 'Kategori' }} />
          <Stack.Screen name="ItemForm" component={ItemFormScreen} options={{ title: 'Menu Item' }} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Detail Pesanan' }} />
        </>
      ) : (
        <Stack.Screen name="AccessDenied" component={AccessDeniedScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    createApiClient(getApiConfig('merchant'));
  }, []);

  useEffect(() => {
    try {
      const api = getApiClient();
      api.setAuthToken(token || undefined);
    } catch (e) {
      // API client not yet created
    }
  }, [token]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="light" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 20,
    opacity: 0.55,
  },
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.neutral[50],
  },
  accessDeniedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  accessDeniedBody: {
    fontSize: 15,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});