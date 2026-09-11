/**
 * PareFood Design System — Button (React Native)
 */
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, brand, spacing, radius } from '../tokens';
import type { ButtonVariant, ButtonSize } from '../components';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  label?: string;
  onPress?: () => void;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

const buttonColors: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: brand.primary, text: '#FFFFFF' },
  secondary: { bg: brand.secondary, text: '#FFFFFF' },
  outline: { bg: 'transparent', text: brand.primary, border: brand.primary },
  ghost: { bg: 'transparent', text: brand.primary },
  danger: { bg: colors.danger.DEFAULT, text: '#FFFFFF' },
};

const buttonSizes: Record<ButtonSize, { height: number; paddingH: number; fontSize: number }> = {
  sm: { height: 36, paddingH: spacing.md, fontSize: 14 },
  md: { height: 44, paddingH: spacing.lg, fontSize: 15 },
  lg: { height: 52, paddingH: spacing.xl, fontSize: 17 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  label,
  onPress,
  style,
  labelStyle,
}: ButtonProps) {
  const palette = buttonColors[variant];
  const dims = buttonSizes[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.base,
        {
          height: dims.height,
          paddingHorizontal: dims.paddingH,
          backgroundColor: isDisabled ? colors.neutral[200] : palette.bg,
          borderWidth: palette.border ? 1 : 0,
          borderColor: palette.border,
          borderRadius: radius.md,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isDisabled ? colors.neutral[400] : palette.text} />
      ) : (
        <Text
          style={[
            styles.label,
            {
              fontSize: dims.fontSize,
              color: isDisabled ? colors.neutral[400] : palette.text,
            },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    fontWeight: '600',
  },
});