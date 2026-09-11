/** Merchant & catalog domain types */
import { Coordinates, UuidEntity } from '../common';

export type MerchantStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'closed';

export interface Merchant extends UuidEntity {
  ownerId: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  address: string;
  coordinates?: Coordinates;
  phone?: string;
  status: MerchantStatus;
  isOpen: boolean;
  minOrder: number;
  rating: number;
  ratingCount: number;
}

export interface MerchantHours {
  id: string;
  merchantId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface MenuCategory extends UuidEntity {
  merchantId: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuVariant {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  isDefault: boolean;
  isAvailable: boolean;
}

export interface MenuAddon {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  isRequired: boolean;
  minSelection: number;
  maxSelection: number;
  sortOrder: number;
  isActive: boolean;
  options: MenuAddonOption[];
}

export interface MenuAddonOption {
  id: string;
  addonId: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface MenuItem extends UuidEntity {
  merchantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  oldPrice?: number;
  imageUrl?: string;
  isAvailable: boolean;
  isFeatured: boolean;
  preparationTimeMinutes?: number;
  sortOrder: number;
  variants: MenuVariant[];
  addons: MenuAddon[];
}

export interface MerchantApplication {
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  categories: string[];
}