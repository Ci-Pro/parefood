import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { brand } from '@parefood/design-system';
import { LoadingIndicator } from '@parefood/design-system/react-native';
import { createApiClient } from '@parefood/api-client';
import { getApiConfig } from '@parefood/config';

import { useAuthStore } from './features/auth/use-auth-store';
import { LoginScreen } from './features/auth/login-screen';
import { RegisterScreen } from './features/auth/register-screen';
import HomeScreen from './features/home/home-screen';
import MerchantListScreen from './features/home/merchant-list-screen';
import MerchantDetailScreen from './features/merchant/merchant-detail-screen';
import MenuDetailScreen from './features/merchant/menu-detail-screen';
import { CartScreen } from './features/cart/cart-screen';
import CheckoutScreen from './features/cart/checkout-screen';
import { OrdersScreen } from './features/orders/orders-screen';
import { OrderDetailScreen } from './features/orders/order-detail-screen';
import PayConfirmScreen from './features/orders/pay-confirm-screen';
import { ProfileScreen } from './features/profile/profile-screen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
            <Text style={[styles.tabIcon, focused && { opacity: 1 }]}>🏠</Text>
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
        name="Profil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && { opacity: 1 }]}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return <LoadingIndicator label="Memuat PareFood..." />;
  }

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
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Daftar' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Merchants" component={MerchantListScreen} options={{ title: 'Merchant' }} />
          <Stack.Screen name="MerchantDetail" component={MerchantDetailScreen} />
          <Stack.Screen name="MenuDetail" component={MenuDetailScreen} />
          <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Keranjang' }} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="PayConfirm" component={PayConfirmScreen} options={{ title: 'Konfirmasi Pembayaran' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    createApiClient(getApiConfig('customer'));
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
});