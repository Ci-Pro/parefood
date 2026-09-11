/**
 * PareFood Design System — Color Tokens
 *
 * Unique brand palette that separates PareFood from other food delivery platforms.
 * - GoFood: Red, GrabFood: Green, ShopeeFood: Orange
 * - PareFood: Deep Teal + Warm Coral + Soft Gold
 */

export const colors = {
  primary: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },

  coral: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },

  gold: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  neutral: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
  },

  success: {
    DEFAULT: '#059669',
    light: '#D1FAE5',
    dark: '#065F46',
  },

  warning: {
    DEFAULT: '#D97706',
    light: '#FEF3C7',
    dark: '#78350F',
  },

  danger: {
    DEFAULT: '#DC2626',
    light: '#FEE2E2',
    dark: '#991B1B',
  },

  info: {
    DEFAULT: '#0284C7',
    light: '#E0F2FE',
    dark: '#075985',
  },
} as const;

// Semantic aliases for design consistency
export const brand = {
  primary: colors.primary[600],
  primaryLight: colors.primary[500],
  primaryDark: colors.primary[700],
  secondary: colors.coral[500],
  secondaryLight: colors.coral[400],
  accent: colors.gold[400],
  background: colors.neutral[50],
  surface: colors.neutral[100],
  surfaceElevated: '#FFFFFF',
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',
  border: colors.neutral[200],
  divider: colors.neutral[100],
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: colors.neutral[900],
} as const;

export type BrandColors = typeof brand;
export type ColorScale = typeof colors;