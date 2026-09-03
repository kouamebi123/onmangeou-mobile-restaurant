import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReviewPhotos } from './review-photos';
import { ReportReview } from './report-review';
import { useState } from 'react';
import { View } from 'react-native';
import { changeDeliveryStatus, fetchDeliveries, fetchMerchantReviews, respondReview } from '@/api/merchant';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { t } from '@/i18n';
import { tokens } from '@/theme';

function errorText(error: unknown) {
  return error instanceof ApiError ? error.problem.detail : t('operations.error');
}

export function DeliveryPanel({ establishmentId }: { establishmentId: string }) {
  const client = useQueryClient();
  const list = useQuery({ queryKey: ['merchant', 'deliveries', establishmentId],
    queryFn: () => fetchDeliveries(establishmentId), refetchInterval: 10000 });
  const change = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => changeDeliveryStatus(id, status),
    onSettled: () => { void client.invalidateQueries({ queryKey: ['merchant'] }); },
  });
  return <View style={{ gap: tokens.spacing.sm }}>
    <AppText variant="subtitle">{t('service.deliveries')}</AppText>
    {list.isPending ? <AppText>{t('operations.loading')}</AppText> : null}
    {list.isError ? <Button label={t('operations.retry')} onPress={() => void list.refetch()} /> : null}
    {list.isSuccess && !list.data.length ? <AppText>{t('service.noDeliveries')}</AppText> : null}
    {change.isError ? <AppText color={tokens.color.feedback.error}>{errorText(change.error)}</AppText> : null}
    {list.data?.map((item) => <View key={item.id} style={{ gap: tokens.spacing.xs }}>
      <AppText>{item.public_ref} · {t(`operations.status.${item.status}`)}</AppText>
      <AppText>{item.customer_name} · {item.address_text}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs }}>
        {(item.allowedActions ?? []).map((status) => <Button key={status} label={t(`operations.action.${status}`)}
          disabled={change.isPending} loading={change.isPending && change.variables?.id === item.id}
          onPress={() => change.mutate({ id: item.id, status })} />)}
      </View>
    </View>)}
  </View>;
}

export function ReviewPanel({ establishmentId }: { establishmentId: string }) {
  const list = useQuery({ queryKey: ['merchant', 'reviews', establishmentId], queryFn: () => fetchMerchantReviews(establishmentId) });
  return <View style={{ gap: tokens.spacing.sm }}>
    <AppText variant="subtitle">{t('service.reviews')}</AppText>
    {list.isPending ? <AppText>{t('operations.loading')}</AppText> : null}
    {list.isError ? <Button label={t('operations.retry')} onPress={() => void list.refetch()} /> : null}
    {list.isSuccess && !list.data.length ? <AppText>{t('service.noReviews')}</AppText> : null}
    {list.data?.map((item) => <ReviewReply key={item.id} item={item} />)}
  </View>;
}

function ReviewReply({ item }: { item: { id: string; score: number; body: string | null; response: string | null; photos?:string[] } }) {
  const client = useQueryClient();
  const [body, setBody] = useState(item.response ?? '');
  const save = useMutation({
    mutationFn: () => respondReview(item.id, body.trim()),
    onSuccess: () => { void client.invalidateQueries({ queryKey: ['merchant', 'reviews'] }); },
  });
  return <View style={{ gap: tokens.spacing.xs }}>
    <AppText>{item.score}/5 · {item.body}</AppText>
    <ReviewPhotos reviewId={item.id} photos={item.photos}/>
    <ReportReview id={item.id}/>
    <TextField label={t('service.reply')} value={body} maxLength={1000} multiline editable={!save.isPending}
      onChangeText={(value) => { setBody(value); save.reset(); }} />
    <Button label={t('service.sendReply')} loading={save.isPending} disabled={body.trim().length < 2}
      onPress={() => save.mutate()} />
    {save.isSuccess ? <AppText>{t('operations.saved')}</AppText> : null}
    {save.isError ? <AppText color={tokens.color.feedback.error}>{errorText(save.error)}</AppText> : null}
  </View>;
}
