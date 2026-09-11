/**
 * PareFood Design System — Badge & StatusBadge (React Native)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../tokens';
import type { StatusVariant } from '../components';

interface BadgeProps {
  label: string;
  variant?: StatusVariant;
  small?: boolean;
}

const badgeColors: Record<StatusVariant, { bg: string; text: string }> = {
  success: { bg: colors.success.light, text: colors.success.dark },
  warning: { bg: colors.warning.light, text: colors.warning.dark },
  danger: { bg: colors.danger.light, text: colors.danger.dark },
  info: { bg: colors.info.light, text: colors.info.dark },
  neutral: { bg: colors.neutral[200], text: colors.neutral[700] },
};

export function Badge({ label, variant = 'neutral', small = false }: BadgeProps) {
  const palette = badgeColors[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.bg,
          paddingHorizontal: small ? spacing.sm : spacing.md,
          paddingVertical: small ? 2 : 4,
          borderRadius: radius.full,
        },
      ]}
    >
      <Text style={[styles.label, { color: palette.text, fontSize: small ? 11 : 13 }]}>
        {label}
      </Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, StatusVariant> = {
    PENDING_PAYMENT: 'warning',
    PAID: 'info',
    WAITING_MERCHANT: 'warning',
    MERCHANT_ACCEPTED: 'info',
    PREPARING: 'warning',
    READY_FOR_PICKUP: 'warning',
    DRIVER_ASSIGNED: 'info',
    DRIVER_PICKING_UP: 'info',
    PICKED_UP: 'info',
    ON_DELIVERY: 'info',
    DELIVERED: 'success',
    COMPLETED: 'success',
    CANCELLED_BY_CUSTOMER: 'danger',
    CANCELLED_BY_MERCHANT: 'danger',
    CANCELLED_BY_ADMIN: 'danger',
    REJECTED_BY_MERCHANT: 'danger',
    REFUND_PENDING: 'warning',
    REFUNDED: 'success',
    FAILED: 'danger',
    PREPARING_ORDER: 'warning',
    OPEN: 'warning',
    IN_PROGRESS: 'info',
    REOPENED: 'warning',
    CLOSED: 'neutral',
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    ACTIVE: 'success',
    INACTIVE: 'neutral',
    ONLINE: 'success',
    OFFLINE: 'neutral',
    BUSY: 'warning',
  };

  const labels: Record<string, string> = {
    PENDING_PAYMENT: 'Menunggu Pembayaran',
    PAID: 'Dibayar',
    WAITING_MERCHANT: 'Menunggu Merchant',
    MERCHANT_ACCEPTED: 'Diterima',
    PREPARING: 'Disiapkan',
    READY_FOR_PICKUP: 'Siap Diambil',
    DRIVER_ASSIGNED: 'Driver Ditugaskan',
    DRIVER_PICKING_UP: 'Menuju Merchant',
    PICKED_UP: 'Sedang Diantar',
    ON_DELIVERY: 'Dalam Perjalanan',
    DELIVERED: 'Terkirim',
    COMPLETED: 'Selesai',
    CANCELLED_BY_CUSTOMER: 'Dibatalkan',
    CANCELLED_BY_MERCHANT: 'Dibatalkan Merchant',
    CANCELLED_BY_ADMIN: 'Dibatalkan Admin',
    REJECTED_BY_MERCHANT: 'Ditolak Merchant',
    REFUND_PENDING: 'Refund Diproses',
    REFUNDED: 'Refund',
    FAILED: 'Gagal',
    OPEN: 'Terbuka',
    IN_PROGRESS: 'Ditindaklanjuti',
    REOPENED: 'Dibuka Ulang',
    CLOSED: 'Ditutup',
    PENDING: 'Menunggu',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
    ACTIVE: 'Aktif',
    INACTIVE: 'Nonaktif',
    ONLINE: 'Online',
    OFFLINE: 'Offline',
  };

  return <Badge label={labels[status] || status} variant={map[status] || 'neutral'} />;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
  },
});