/** Customer domain types */
import { Coordinates, UuidEntity } from '../common';

export interface CustomerAddress extends UuidEntity {
  profileId: string;
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  note?: string;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  variantId?: string;
  variantName?: string;
  variantPrice: number;
  quantity: number;
  unitPrice: number;
  notes?: string;
  addons: CartItemAddon[];
}

export interface CartItemAddon {
  addonId: string;
  addonName: string;
  addonOptionId: string;
  optionName: string;
  optionPrice: number;
}

export interface Cart {
  id: string;
  merchantId: string;
  items: CartItem[];
  subtotal: number;
}

export interface CheckoutSummary {
  subtotal: number;
  addonsTotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  tax: number;
  grandTotal: number;
  estimatedTimeMinutes?: number;
}

export interface Location {
  coordinates: Coordinates;
  address: string;
  label: string;
}