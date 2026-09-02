import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { changeReservationStatus, fetchMerchantReservations, fetchReservationHistory } from '@/api/merchant';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { t } from '@/i18n';
import { tokens } from '@/theme';

const transitions: Record<string, string[]> = {
  REQUESTED: ['CONFIRMED', 'REJECTED'],
  CONFIRMED: ['SEATED', 'CANCELLED', 'NO_SHOW'],
  SEATED: ['COMPLETED'],
};

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
    onSettled: () => { void client.invalidateQueries({ queryKey: ['merchant', 'reservations'] }); },
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
    {listing.isPending ? <AppText>{t('reservation.loading')}</AppText> : null}
    {listing.isError ? <AppText selectable color={tokens.color.feedback.error}>{t('reservation.error')}</AppText> : null}
    {listing.isSuccess && !items?.length ? <AppText>{t(view === 'history' ? 'reservation.historyEmpty' : 'service.noReservations')}</AppText> : null}
    {change.isError ? <AppText color={tokens.color.feedback.error}>
      {change.error instanceof ApiError ? change.error.problem.detail : t('reservation.error')}
    </AppText> : null}
    {items?.map((item) => <View key={item.id} style={{ backgroundColor: tokens.color.surface.white, padding: tokens.spacing.sm, gap: tokens.spacing.xs, borderWidth: 1, borderColor: tokens.color.border.default, borderRadius: tokens.radius.card }}>
      <AppText variant="subtitle">{item.customer_name} · {item.party_size} {t('reservation.people')}</AppText>
      <AppText selectable>{new Date(item.starts_at).toLocaleString('fr-FR', { timeZone: item.timezone ?? 'Africa/Abidjan', dateStyle: 'full', timeStyle: 'short' })}</AppText>
      <AppText variant="caption">{item.timezone ?? 'Africa/Abidjan'} · {item.public_ref}</AppText>
      <AppText>{t(`reservation.${item.status}`)}</AppText>
      {item.table_name ? <AppText>{t('reservation.table', { name: item.table_name })}</AppText> : null}
      <AppText selectable>{item.customer_phone}</AppText>
      {item.notes ? <AppText>{item.notes}</AppText> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs }}>
        {(transitions[item.status] ?? []).map((status) => <Button key={status} label={t(`reservation.action.${status}`)}
          variant="outline" disabled={change.isPending}
          loading={change.isPending && change.variables?.id === item.id && change.variables.status === status}
          onPress={() => change.mutate({ id: item.id, status })} />)}
      </View>
    </View>)}
    {view === 'history' && history.hasNextPage ? <Button variant="outline" label={t('reservation.loadMore')}
      loading={history.isFetchingNextPage} disabled={history.isFetching}
      onPress={() => { void history.fetchNextPage(); }} /> : null}
  </View>;
}
