import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { changeReservationStatus, fetchMerchantReservations } from '@/api/merchant';
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
  const reservations = useQuery({
    queryKey: ['merchant', 'reservations', establishmentId],
    queryFn: () => fetchMerchantReservations(establishmentId),
    refetchInterval: 15000,
  });
  const change = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => changeReservationStatus(id, status),
    onSettled: () => { void client.invalidateQueries({ queryKey: ['merchant', 'reservations'] }); },
  });
  return <View style={{ gap: tokens.spacing.sm }}>
    <AppText variant="subtitle">{t('service.reservations')}</AppText>
    <Button variant="ghost" label={t('reservation.refresh')} onPress={() => void reservations.refetch()} />
    {reservations.isPending ? <AppText>{t('reservation.loading')}</AppText> : null}
    {reservations.isError ? <AppText>{t('reservation.error')}</AppText> : null}
    {reservations.isSuccess && !reservations.data.length ? <AppText>{t('service.noReservations')}</AppText> : null}
    {change.isError ? <AppText color={tokens.color.feedback.error}>
      {change.error instanceof ApiError ? change.error.problem.detail : t('reservation.error')}
    </AppText> : null}
    {reservations.data?.map((item) => <View key={item.id} style={{ padding: tokens.spacing.sm, gap: tokens.spacing.xs, borderWidth: 1, borderColor: tokens.color.border.default, borderRadius: tokens.radius.card }}>
      <AppText variant="subtitle">{item.customer_name} · {item.party_size} {t('reservation.people')}</AppText>
      <AppText selectable>{new Date(item.starts_at).toLocaleString('fr-FR', { timeZone: item.timezone ?? 'Africa/Abidjan', dateStyle: 'full', timeStyle: 'short' })}</AppText>
      <AppText variant="caption">{item.timezone ?? 'Africa/Abidjan'} · {item.public_ref}</AppText>
      <AppText>{t(`reservation.${item.status}`)}</AppText>
      <AppText selectable>{item.customer_phone}</AppText>
      {item.notes ? <AppText>{item.notes}</AppText> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs }}>
        {(transitions[item.status] ?? []).map((status) => <Button key={status} label={t(`reservation.action.${status}`)}
          variant="outline" disabled={change.isPending}
          loading={change.isPending && change.variables?.id === item.id && change.variables.status === status}
          onPress={() => change.mutate({ id: item.id, status })} />)}
      </View>
    </View>)}
  </View>;
}
