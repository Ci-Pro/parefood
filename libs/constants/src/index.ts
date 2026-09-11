/** PareFood application constants */

export const APP_NAME = 'PareFood';
export const APP_TAGLINE = 'Pesan makan, sampai di depan pintu';

export const API_ENDPOINTS = {
  auth: {
    register: (role: string) => `/auth/register/${role}`,
    login: '/auth/login',
    refresh: '/auth/refresh',
    me: '/auth/me',
    logout: '/auth/logout',
  },
  profiles: {
    me: '/profiles/me',
  },
  merchants: {
    list: '/merchants',
    read: (id: string) => `/merchants/${id}`,
    menuItems: (id: string) => `/merchants/menu-items/${id}`,
    mine: '/merchants/mine',
  },
  menu: {
    categories: (merchantId: string) => `/merchants/${merchantId}/menu-categories`,
    items: (merchantId: string) => `/merchants/${merchantId}/menu-items`,
  },
  orders: {
    create: '/orders',
    read: (id: string) => `/orders/${id}`,
    mine: '/orders/mine',
    status: (id: string) => `/orders/${id}/status`,
  },
  delivery: {
    offers: '/deliveries/offers',
    read: (id: string) => `/deliveries/${id}`,
    status: (id: string) => `/deliveries/${id}/status`,
  },
  payments: {
    confirm: (orderId: string) => `/payments/orders/${orderId}/confirm`,
  },
  notifications: {
    mine: '/notifications/mine',
  },
} as const;

export const ORDER_CANCELLATION_WINDOW_MINUTES = 10;

export const SUPPORTED_PAYMENT_METHODS = ['cash', 'bank_transfer', 'qris', 'virtual_account', 'ewallet'] as const;

export const MAX_FILE_SIZE_MB = 10;
export const MAX_QUANTITY_PER_ITEM = 20;

export const DEBOUNCE_MS = 300;
export const API_TIMEOUT_MS = 30000;