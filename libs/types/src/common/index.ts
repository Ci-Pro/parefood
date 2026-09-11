/** Shared common TypeScript models across all PareFood apps */

export type Role =
  | 'customer'
  | 'merchant_owner'
  | 'merchant_staff'
  | 'driver'
  | 'admin_operations'
  | 'admin_finance'
  | 'admin_support'
  | 'super_admin';

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface SoftDelete {
  isRemoved: boolean;
}

export interface UuidEntity extends Timestamps {
  id: string;
}

export interface Pagination {
  page: number;
  size: number;
  total: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface ApiError {
  code: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Money {
  amount: number;
  currency: 'IDR';
}

export interface NavigationParams {
  orderId?: string;
  merchantId?: string;
  deliveryId?: string;
  [key: string]: unknown;
}