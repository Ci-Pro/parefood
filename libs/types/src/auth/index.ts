/** Authentication & identity models */
import { Role } from '../common';

export interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'customer' | 'driver' | 'merchant_owner';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}