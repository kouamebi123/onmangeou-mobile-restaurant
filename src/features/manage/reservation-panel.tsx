import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, View } from 'react-native';
import { changeReservationStatus, fetchMerchantReservations, fetchReservationHistory } from '@/api/merchant';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Appear } from '@/components/motion';
import { StatusChip, type ChipTone } from '@/components/status-chip';
import { t } from '@/i18n';
import { tokens } from '@/theme';

const transitions: Record<string, string[]> = {
  REQUESTED: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['SEATED', 'CANCELLED', 'NO_SHOW'],
  SEATED: ['COMPLETED'],
};

function reservationTone(status: string): ChipTone {
  if (status === 'CONFIRMED' || status === 'SEATED' || status === 'COMPLETED') return 'success';
  if (status === 'REJECTED' || status === 'NO_SHOW') return 'danger';
  if (status === 'CANCELLED') return 'neutral';
  return 'progress';
}

export function ReservationPanel({ establishmentId }: { establishmentId: string }) {
  const client = useQueryClient();
  const [view, setView] = useState<'active' | 'history'>('active');
  const reservations = useQuery({
    queryKey: ['merchant', 'reservations', establishmentId],
    queryFn: () => fetchMerchantReservations(establishmentId),
    refetchInterval: 15000,
    enabled: view === 'active',
  });
  const history = useInfiniteQuery({
    queryKey: ['merchant', 'reservations', establishmentId, 'history'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchReservationHistory(establishmentId, pageParam),
    getNextPageParam: (page) => page.meta.nextCursor ?? undefined,
    enabled: view === 'history',
  });
  const listing = view === 'history' ? history : reservations;
  const items = view === 'history' ? history.data?.pages.flatMap((page) => page.data) : reservations.data;
  const change = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => changeReservationStatus(id, status),
    onSettled: () => {
      // Always reload the server state. This prevents stale buttons from remaining
      // visible after another terminal has already changed the reservation.
      void client.invalidateQueries({ queryKey: ['merchant', 'reservations'] });
    },
  });
  return <View style={{ gap: tokens.spacing.sm }}>
    <AppText variant="subtitle">{t('service.reservations')}</AppText>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs }}>
      {(['active', 'history'] as const).map((tab) => <Button key={tab} label={t(`reservation.${tab}`)}
        variant={view === tab ? 'primary' : 'outline'} accessibilityState={{ selected: view === tab }}
        onPress={() => setView(tab)} />)}
    </View>
    <AppText variant="caption">{t('reservation.duration')}</AppText>
    <Button variant="ghost" label={t('reservation.refresh')} loading={listing.isRefetching} onPress={() => { void listing.refetch(); }} />
    {/* Chaque vue (en cours, historique) arrive en fondu ; une réservation garde sa clé et ne rejoue rien au relevé. */}
    <Appear key={view} style={styles.list}>
    {listing.isPending ? <AppText>{t('reservation.loading')}</AppText> : null}
    {listing.isError ? <Appear><AppText selectable color={tokens.color.feedback.error}>{t('reservation.error')}</AppText></Appear> : null}
    {listing.isSuccess && !items?.length ? <Appear><AppText>{t(view === 'history' ? 'reservation.historyEmpty' : 'service.noReservations')}</AppText></Appear> : null}
    {change.isError ? <Appear><AppText selectable color={tokens.color.feedback.error}>
      {change.error instanceof ApiError ? change.error.problem.detail : t('reservation.error')}
    </AppText></Appear> : null}
    {items?.map((item) => {
      const actions = transitions[item.status] ?? [];
      return <Appear key={item.id} style={styles.card}>
        <View style={styles.head}>
          <StatusChip label={t(`reservation.${item.status}`)} tone={reservationTone(item.status)} />
          <AppText variant="caption" selectable>{item.public_ref}</AppText>
        </View>
        <AppText variant="subtitle" selectable>
          {new Date(item.starts_at).toLocaleString('fr-FR', { timeZone: item.timezone ?? 'Africa/Abidjan', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </AppText>
        <AppText>{item.customer_name} · {item.party_size} {t('reservation.people')}</AppText>
        {item.table_name ? <AppText variant="muted">{t('reservation.table', { name: item.table_name })}</AppText> : null}
        {item.notes ? <AppText variant="muted">{item.notes}</AppText> : null}
        {item.customer_phone ? <Pressable accessibilityRole="link" accessibilityLabel={t('reservation.call', { phone: item.customer_phone })}
          onPress={() => { void Linking.openURL(`tel:${item.customer_phone}`); }} style={styles.phone}>
          <Ionicons name="call-outline" size={16} color={tokens.color.brand.primary} />
          <AppText color={tokens.color.brand.primary} style={styles.phoneLabel} selectable>{item.customer_phone}</AppText>
        </Pressable> : null}
        {actions.length > 0 ? <View style={styles.actions}>
          {actions.map((status, index) => <Button key={status} label={t(`reservation.action.${status}`)}
            variant={index === 0 ? 'primary' : status === 'CANCELLED' ? 'ghost' : 'outline'} disabled={change.isPending}
            loading={change.isPending && change.variables?.id === item.id && change.variables.status === status}
            onPress={() => change.mutate({ id: item.id, status })} />)}
        </View> : null}
      </Appear>;
    })}
    {view === 'history' && history.hasNextPage ? <Appear><Button variant="outline" label={t('reservation.loadMore')}
      loading={history.isFetchingNextPage} disabled={history.isFetching}
      onPress={() => { void history.fetchNextPage(); }} /></Appear> : null}
    </Appear>
  </View>;
}

const styles = StyleSheet.create({
  list: { gap: tokens.spacing.sm },
  card: {
    gap: tokens.spacing.xs,
    padding: tokens.spacing.md,
    backgroundColor: tokens.color.surface.white,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    borderRadius: tokens.radius.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  phone: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs, minHeight: 32 },
  phoneLabel: { fontFamily: tokens.typography.family.semibold },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs, marginTop: tokens.spacing.xs },
});
