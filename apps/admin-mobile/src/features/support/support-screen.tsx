import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Card, StatusBadge, LoadingIndicator, ErrorState, EmptyState } from '@parefood/design-system/react-native';
import { colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

type Navigation = { navigate: (s: string, p?: unknown) => void };

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority?: string;
  user_id: string;
  last_message_at?: string;
  created_at?: string;
  message_count?: number;
}

export default function SupportScreen() {
  const navigation = useNavigation<Navigation>();

  const { data, isLoading, isError, refetch } = useQuery<{ tickets: Ticket[] }>({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const api = getApiClient();
      return api.get<{ tickets: Ticket[] }>('/admin/support/tickets');
    },
  });

  const tickets = data?.tickets || [];

  return (
    <View style={styles.container}>
      {isLoading ? (
        <LoadingIndicator label="Memuat tiket..." />
      ) : isError ? (
        <ErrorState message="Gagal memuat tiket" onRetry={() => refetch()} />
      ) : tickets.length === 0 ? (
        <EmptyState title="Belum ada tiket bantuan" />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id } as never)}
            >
              <Card style={styles.ticketCard}>
                <View style={styles.row}>
                  <Text style={styles.subject} numberOfLines={1}>
                    {item.subject}
                  </Text>
                  <StatusBadge status={item.status} />
                </View>
                <View style={styles.meta}>
                  <Text style={styles.dim}>{item.user_id}</Text>
                  {item.message_count ? (
                    <Text style={styles.dim}>{item.message_count} pesan</Text>
                  ) : null}
                  {item.last_message_at ? (
                    <Text style={styles.dim}>
                      {new Date(item.last_message_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  ) : null}
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  content: {
    padding: spacing.md,
    paddingBottom: 48,
  },
  ticketCard: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subject: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    flex: 1,
    marginRight: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  dim: {
    fontSize: 12,
    color: colors.neutral[400],
  },
});