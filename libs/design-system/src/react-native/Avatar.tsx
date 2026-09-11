/**
 * PareFood Design System — Avatar (React Native)
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, brand, radius } from '../tokens';

interface AvatarProps {
  name?: string;
  uri?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { sm: 32, md: 40, lg: 56, xl: 72 };
const fontSizes = { sm: 12, md: 16, lg: 20, xl: 26 };

export function Avatar({ name = '', uri, size = 'md' }: AvatarProps) {
  const dim = sizes[size];
  const initials = name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, { width: dim, height: dim, borderRadius: dim / 2 }]} />;
  }

  return (
    <View style={[styles.placeholder, { width: dim, height: dim, borderRadius: dim / 2 }]}>
      <Text style={[styles.initials, { fontSize: fontSizes[size] }]}>{initials || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.neutral[200],
  },
  placeholder: {
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});