import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { Card, StatusBadge, LoadingIndicator, ErrorState, Button, Input, Badge } from '@parefood/design-system/react-native';
import { colors, spacing } from '@parefood/design-system';
import { getApiClient } from '@parefood/api-client';

interface Message {
  id: string;
  message: string;
  is_from_support?: boolean;
  user_id?: string;
  created_at?: string;
}

interface TicketDetail {
  ticket: {
    id: string;
    subject: string;
    status: string;
    user_id: string;
    messages: Message[];
  };
}

export default function TicketDetailScreen() {
  const route = useRoute();
  const queryClient = useQueryClient();
  const params = route.params as { ticketId: string } | undefined;
  const ticketId = params?.ticketId || '';
  const [reply, setReply] = useState('');

  const { data, isLoading, isError, refetch } = useQuery<TicketDetail>({
    queryKey: ['admin-support-ticket', ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const api = getApiClient();
      return api.get<TicketDetail>(`/admin/support/tickets/${ticketId}`);
    },
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      const api = getApiClient();
      return api.post(`/admin/support/tickets/${ticketId}/reply`, { message: reply });
    },
    onSuccess: async () => {
      setReply('');
      await queryClient.invalidateQueries({ queryKey: ['admin-support-ticket', ticketId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      alert(err?.response?.data?.error?.message || err?.message || 'Gagal mengirim balasan');
    },
  });

  const closeTicket = useMutation({
    mutationFn: async () => {
      const api = getApiClient();
      return api.post(`/admin/support/tickets/${ticketId}/close`, {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-support-ticket', ticketId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      alert(err?.response?.data?.error?.message || err?.message || 'Gagal menutup tiket');
    },
  });

  if (isLoading) return <LoadingIndicator label="Memuat tiket..." />;
  if (isError || !data)
    return <ErrorState message="Tiket tidak ditemukan" onRetry={() => refetch()} />;

  const ticket = data.ticket;
  const closed = ticket.status === 'CLOSED';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.subject}>{ticket.subject}</Text>
            <StatusBadge status={ticket.status} />
          </View>
          <Text style={styles.dim}>Pelapor: {ticket.user_id}</Text>
        </Card>

        {(ticket.messages || []).map((msg) => (
          <View key={msg.id} style={[styles.bubble, msg.is_from_support ? styles.bubbleSupport : styles.bubbleUser]}>
            <Text style={[styles.bubbleText, msg.is_from_support && styles.bubbleTextSupport]}>
              {msg.message}
            </Text>
            <Text style={styles.bubbleMeta}>
              {msg.is_from_support ? 'Admin' : 'Pelapor'} ·{' '}
              {msg.created_at
                ? new Date(msg.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : ''}
            </Text>
          </View>
        ))}

        {closed ? (
          <View style={styles.closedBadge}>
            <Badge label="Tiket Ditutup" variant="info" />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.replyBar}>
        <Input
          value={reply}
          onChangeText={setReply}
          placeholder="Tulis balasan..."
          multiline
          style={styles.replyInput}
        />
        <Button
          label="Kirim"
          size="sm"
          disabled={!reply.trim() || closed || sendReply.isPending}
          onPress={() => sendReply.mutate()}
        />
      </View>

      {!closed ? (
        <Button
          label="Tutup Tiket"
          variant="danger"
          size="md"
          fullWidth
          style={styles.closeBtn}
          onPress={() =>
            Alert.alert('Tutup Tiket?', 'Tiket akan ditandai selesai.', [
              { text: 'Batal', style: 'cancel' },
              { text: 'Tutup', onPress: () => closeTicket.mutate() },
            ])
          }
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 24,
  },
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subject: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    flex: 1,
    marginRight: spacing.sm,
  },
  dim: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: spacing.xs,
  },
  bubble: {
    maxWidth: '85%',
    padding: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  bubbleUser: {
    alignSelf: 'flex-start',
    backgroundColor: colors.neutral[100],
  },
  bubbleSupport: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary[600],
  },
  bubbleText: {
    fontSize: 14,
    color: colors.neutral[800],
  },
  bubbleTextSupport: {
    color: '#FFFFFF',
  },
  bubbleMeta: {
    fontSize: 11,
    color: colors.neutral[400],
    marginTop: 4,
  },
  closedBadge: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: '#FFFFFF',
  },
  replyInput: {
    flex: 1,
  },
  closeBtn: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
});