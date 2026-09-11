/** Delivery driver domain types */
import { UuidEntity, Coordinates } from '../common';

export type DriverStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'offline' | 'online';

export interface Driver extends UuidEntity {
  profileId: string;
  vehicleType: string;
  vehicleNumber: string;
  vehicleName?: string;
  phone?: string;
  status: DriverStatus;
  currentLatitude?: number;
  currentLongitude?: number;
  rating: number;
  totalDeliveries: number;
}

export interface DriverDocument {
  id: string;
  driverId: string;
  type: 'ktp' | 'sim' | 'stnk' | 'foto';
  url: string;
  isVerified: boolean;
  uploadedAt: string;
}

export type DeliveryStatus =
  | 'PENDING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'PICKING_UP'
  | 'PICKED_UP'
  | 'ON_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface Delivery extends UuidEntity {
  orderId: string;
  driverId?: string;
  status: DeliveryStatus;
  assignedAt?: string;
  acceptedAt?: string;
  pickupAt?: string;
  deliveredAt?: string;
  pickupProofNote?: string;
  deliveryProofNote?: string;
  route?: Coordinates[];
}

export interface DriverAssignment {
  id: string;
  deliveryId: string;
  driverId?: string;
  offeredAt: string;
  expiresAt?: string;
  status: 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'ASSIGNED';
}