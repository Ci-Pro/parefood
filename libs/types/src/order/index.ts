/** Order domain types */

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'WAITING_MERCHANT'
  | 'MERCHANT_ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_PICKING_UP'
  | 'PICKED_UP'
  | 'ON_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED_BY_CUSTOMER'
  | 'CANCELLED_BY_MERCHANT'
  | 'CANCELLED_BY_ADMIN'
  | 'REJECTED_BY_MERCHANT'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'FAILED';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'qris' | 'virtual_account' | 'ewallet';

export interface OrderItem {
  id: string;
  menuItemId?: string;
  name: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  variantName?: string;
  variantPrice: number;
  notes?: string;
  options: OrderItemOption[];
}

export interface OrderItemOption {
  id: string;
  addonName: string;
  optionName: string;
  optionPrice: number;
}

export interface OrderPricing {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  grandTotal: number;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  actorId?: string;
  actorRole?: string;
  reason?: string;
  createdAt: string;
}

export interface Order extends OrderPricing {
  id: string;
  orderNumber: string;
  customerId: string;
  merchantId: string;
  merchantName?: string;
  addressId: string;
  deliveryAddress: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  promotionId?: string;
  notes?: string;
  customerNotes?: string;
  estimatedTimeMinutes?: number;
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
}