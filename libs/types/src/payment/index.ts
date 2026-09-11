/** Payment, finance & settlement domain types */
import { UuidEntity } from '../common';
import { PaymentMethod, PaymentStatus } from '../order';

export interface Payment extends UuidEntity {
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  provider?: string;
  providerRef?: string;
  paidAt?: string;
  idempotencyKey: string;
}

export interface PaymentEvent {
  id: string;
  paymentId: string;
  type: 'CREATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  providerEvent?: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PROCESSED' | 'COMPLETED';

export interface Refund {
  id: string;
  orderId: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  requestedBy: string;
  handledBy?: string;
  handledAt?: string;
  note?: string;
}

export type SettlementStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAID' | 'REJECTED';

export interface Settlement extends UuidEntity {
  entityType: 'merchant' | 'driver';
  entityId: string;
  periodStart: string;
  periodEnd: string;
  gross: number;
  fees: number;
  adjustments: number;
  net: number;
  status: SettlementStatus;
  approvedBy?: string;
  paidAt?: string;
}

export interface EarningsSummary {
  gross: number;
  fees: number;
  net: number;
  transactions: number;
}