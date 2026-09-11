/**
 * PareFood Design System — Price (React Native)
 */
import React from 'react';
import { Text, TextStyle } from 'react-native';
import { brand, colors, typography } from '../tokens';

interface PriceProps {
  amount: number;
  size?: keyof typeof typography.sizes;
  weight?: keyof typeof typography.weights;
  color?: string;
  strikethrough?: boolean;
  prefix?: string;
  style?: TextStyle;
}

export function Price({
  amount,
  size = 'body',
  weight = 'semibold',
  color = brand.textPrimary,
  strikethrough = false,
  prefix = 'Rp',
  style,
}: PriceProps) {
  const formatted = amount.toLocaleString('id-ID');

  return (
    <Text
      style={[
        {
          fontSize: typography.sizes[size],
          fontWeight: typeof weight === 'string' ? (weight === 'regular' ? '400' : weight === 'medium' ? '500' : weight === 'semibold' ? '600' : '700') : '600',
          color,
          textDecorationLine: strikethrough ? 'line-through' : 'none',
        },
        style,
      ]}
    >
      {prefix} {formatted}
    </Text>
  );
}