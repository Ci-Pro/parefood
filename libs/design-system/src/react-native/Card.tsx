/**
 * PareFood Design System — Card (React Native)
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, brand, spacing, radius, elevation } from '../tokens';

interface CardProps {
  children?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof spacing | number;
  radiusSize?: keyof typeof radius;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({
  children,
  variant = 'elevated',
  padding = 'md',
  radiusSize = 'lg',
  onPress,
  style,
}: CardProps) {
  const pad = typeof padding === 'number' ? padding : spacing[padding];
  const bg = variant === 'elevated' ? '#FFFFFF' : variant === 'outlined' ? '#FFFFFF' : colors.neutral[50];
  const borderColor = variant === 'outlined' ? colors.neutral[200] : 'transparent';

  const content = (
    <View
      style={[
        styles.base,
        {
          padding: pad,
          backgroundColor: bg,
          borderWidth: borderColor === 'transparent' ? 0 : 1,
          borderColor,
        },
        variant === 'elevated' && elevation.md,
        { borderRadius: radius[radiusSize] },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});