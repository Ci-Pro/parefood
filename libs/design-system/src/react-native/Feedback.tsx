/**
 * PareFood Design System — EmptyState, ErrorState, LoadingIndicator (React Native)
 */
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, brand, spacing, typography } from '../tokens';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.center}>
      {icon ? <View style={{ marginBottom: spacing.md }}>{icon}</View> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDesc}>{description}</Text> : null}
      {action ? <View style={{ marginTop: spacing.md }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>{title || 'Terjadi Kesalahan'}</Text>
      <Text style={styles.errorDesc}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          style={styles.retryBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function LoadingIndicator({
  size = 'md',
  color = brand.primary,
  label,
}: {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  label?: string;
}) {
  const indicatorSize = size === 'sm' ? 'small' : 'large';

  return (
    <View style={styles.center}>
      <ActivityIndicator size={indicatorSize} color={color} />
      {label ? <Text style={styles.loadLabel}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 200,
  },
  emptyTitle: {
    fontSize: typography.sizes.subtitle,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    fontSize: typography.sizes.body,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: typography.sizes.subtitle,
    fontWeight: '600',
    color: colors.danger.DEFAULT,
    marginBottom: spacing.xs,
  },
  errorDesc: {
    fontSize: typography.sizes.body,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 9999,
    backgroundColor: brand.primary,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: typography.sizes.body,
  },
  loadLabel: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.caption,
    color: colors.neutral[500],
  },
});