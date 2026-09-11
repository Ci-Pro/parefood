/**
 * PareFood Design System — Shared Components
 *
 * Platform-agnostic component definitions shared across apps.
 * Platform-specific implementations (React Native / Web) are provided
 * by each app's own component layer.
 */

import React from 'react';
import { colors, brand, spacing, radius, elevation, typography } from '../tokens';

export * from '../tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  children?: React.ReactNode;
}

export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  error?: string;
  helper?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface CardProps {
  children?: React.ReactNode;
  padding?: keyof typeof spacing;
  radius?: keyof typeof radius;
  variant?: 'default' | 'elevated' | 'outlined';
  onPress?: () => void;
}

export interface BadgeProps {
  label: string;
  variant?: StatusVariant;
}

export interface AvatarProps {
  name?: string;
  uri?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface PriceProps {
  amount: number;
  size?: keyof typeof typography.sizes;
  weight?: keyof typeof typography.weights;
  color?: string;
  strikethrough?: boolean;
  prefix?: string;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  label?: string;
}

export interface StatusBadgeProps {
  status: string;
}

export const semanticColors = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.info,
  neutral: colors.neutral,
};

export const baseStyles = {
  colors: brand,
  spacing,
  radius,
  elevation,
  typography,
};