/**
 * PareFood shared configuration
 * Uses environment variables or sensible defaults per platform.
 */

export type AppType = 'customer' | 'merchant' | 'driver' | 'admin-mobile' | 'admin-web';

export interface ApiConfig {
  apiUrl: string;
  apiVersion: string;
  wsUrl?: string;
  timeout: number;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const appTypes: AppType[] = ['customer', 'merchant', 'driver', 'admin-mobile', 'admin-web'];

function env(key: string, fallback = ''): string {
  return (
    typeof process !== 'undefined' && process.env ? process.env[key] || '' : ''
  ) || fallback;
}

export const DEFAULT_API_URLS: Record<AppType, string> = {
  customer: env('EXPO_PUBLIC_API_URL', 'http://localhost:8000/api/v1'),
  merchant: env('EXPO_PUBLIC_API_URL', 'http://localhost:8000/api/v1'),
  driver: env('EXPO_PUBLIC_API_URL', 'http://localhost:8000/api/v1'),
  'admin-mobile': env('EXPO_PUBLIC_API_URL', 'http://localhost:8000/api/v1'),
  'admin-web': env('NEXT_PUBLIC_API_URL', 'http://localhost:8000/api/v1'),
};

export function getApiConfig(appType: AppType): ApiConfig {
  const apiUrl = (DEFAULT_API_URLS[appType] || 'http://localhost:8000/api/v1').replace(/\/$/, '');
  return {
    apiUrl,
    apiVersion: 'v1',
    wsUrl: apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1$/, '/socket'),
    timeout: 30000,
  };
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: env('EXPO_PUBLIC_SUPABASE_URL', env('NEXT_PUBLIC_SUPABASE_URL')),
    anonKey: env('EXPO_PUBLIC_SUPABASE_ANON_KEY', env('NEXT_PUBLIC_SUPABASE_ANON_KEY')),
  };
}

export const isDevelopment = env('NODE_ENV', 'development') === 'development';
export const isProduction = env('NODE_ENV') === 'production';

export const runtimeConfig = {
  isDevelopment,
  isProduction,
  appEnvironment: env('APP_ENV', 'development'),
  api: {
    version: 'v1',
    timeout: 30000,
  },
} as const;