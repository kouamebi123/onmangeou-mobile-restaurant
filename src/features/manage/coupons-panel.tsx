import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { createIdempotencyKey } from '@/api/device';
import { createCoupon, fetchCoupons, fetchEntitlements, hasModule, MODULE_CODES, setCouponActive } from '@/api/merchant';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { hapticSuccess } from '@/feedback/haptics';
import { t } from '@/i18n';
import { tokens } from '@/theme';
import { CompletionCard, CompletionError } from './completion-ui';

export function CouponsPanel({ establishmentId }: { establishmentId: string }) {
  const client = useQueryClient();
  const entitlements = useQuery({ queryKey: ['merchant', 'entitlements'], queryFn: () => fetchEntitlements() });
  const enabled = hasModule(entitlements.data?.enabledModules, MODULE_CODES.MARKETING_PROMOTIONS);
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('');
  const [minimum, setMinimum] = useState('');
  const [days, setDays] = useState(7);
  const [confirmation, setConfirmation] = useState<{ id: string; active: boolean; code: string } | null>(null);
  const attempt = useRef<{ signature: string; key: string; expiresAt?: string } | null>(null);
  const queryKey = ['merchant', 'coupons', establishmentId];
  const coupons = useInfiniteQuery({ queryKey, initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchCoupons(establishmentId, pageParam),
    getNextPageParam: (page, pages) => page.length === 50 ? pages.length * 50 : undefined, enabled });
  const items = coupons.data?.pages.flat();
  const create = useMutation({
    mutationFn: () => {
      const signature = JSON.stringify({ establishmentId, code: code.trim().toUpperCase(), percent, minimum, days });
      if (attempt.current?.signature !== signature) attempt.current = {
        signature, key: createIdempotencyKey(), expiresAt: days ? new Date(Date.now() + days * 86400000).toISOString() : undefined,
      };
      return createCoupon(establishmentId, code.trim().toUpperCase(), Number(percent) * 100, attempt.current.key,
        { minimumAmount: minimum || '0', expiresAt: attempt.current.expiresAt });
    },
    onSuccess: async () => {
      attempt.current = null; setCode(''); setPercent(''); setMinimum(''); hapticSuccess();
      await client.invalidateQueries({ queryKey });
    },
  });
  const status = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setCouponActive(id, active),
    onSuccess: async () => { setConfirmation(null); hapticSuccess(); await client.invalidateQueries({ queryKey }); },
  });
  const valid = /^[A-Z0-9_-]{3,40}$/.test(code.trim().toUpperCase()) && /^\d{1,3}$/.test(percent)
    && Number(percent) >= 1 && Number(percent) <= 100 && /^(0|[1-9]\d{0,14})$/.test(minimum || '0');
  if (!enabled) return null;
  return <CompletionCard>
    <AppText variant="subtitle">{t('manage.coupons')}</AppText>
    <AppText variant="muted">{t('couponManager.hint')}</AppText>
    {coupons.isPending ? <AppText>{t('couponManager.loading')}</AppText> : null}
    <CompletionError error={coupons.error} />
    {coupons.isError ? <Button label={t('couponManager.retry')} variant="outline" onPress={() => { void coupons.refetch(); }} /> : null}
    {items?.length === 0 ? <AppText variant="muted">{t('couponManager.empty')}</AppText> : null}
    {items?.map(item => {
      const expired = Boolean(item.expires_at && new Date(item.expires_at).getTime() <= Date.now());
      return <View key={item.id} style={{ gap: tokens.spacing.xs, padding: tokens.spacing.md, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surface.mint }}>
        <AppText variant="subtitle" selectable>{item.code} · −{item.discount_bps / 100} %</AppText>
        <AppText>{t(expired ? 'couponManager.expired' : item.active ? 'couponManager.active' : 'couponManager.inactive')}</AppText>
        <AppText variant="muted">{t('couponManager.minimumLabel', { amount: item.minimum_amount })}</AppText>
        <AppText variant="muted">{item.expires_at ? t('couponManager.expires', { date: new Date(item.expires_at).toLocaleString('fr-FR') }) : t('couponManager.unlimited')}</AppText>
        {!expired ? <Button label={t(item.active ? 'couponManager.disable' : 'couponManager.enable')} variant="outline"
          loading={status.isPending && status.variables?.id === item.id} disabled={status.isPending}
          onPress={() => { status.reset(); setConfirmation({ id: item.id, active: !item.active, code: item.code }); }} /> : null}
        {confirmation?.id === item.id ? <>
          <AppText>{t(confirmation.active ? 'couponManager.confirmEnable' : 'couponManager.confirmDisable', { code: item.code })}</AppText>
          <Button label={t('couponManager.confirm')} loading={status.isPending} onPress={() => status.mutate(confirmation)} />
          <Button label={t('couponManager.cancel')} variant="ghost" disabled={status.isPending} onPress={() => setConfirmation(null)} />
        </> : null}
      </View>;
    })}
    {coupons.hasNextPage ? <Button label={t('couponManager.more')} variant="outline" loading={coupons.isFetchingNextPage} onPress={() => { void coupons.fetchNextPage(); }} /> : null}
    <CompletionError error={status.error} />
    <AppText variant="subtitle">{t('manage.createCoupon')}</AppText>
    <TextField label={t('manage.couponCode')} value={code} onChangeText={setCode} autoCorrect={false} autoCapitalize="characters" maxLength={40} editable={!create.isPending} />
    <TextField label={t('manage.couponDiscount')} keyboardType="number-pad" value={percent} onChangeText={setPercent} maxLength={3} editable={!create.isPending} />
    <TextField label={t('couponManager.minimum')} keyboardType="number-pad" value={minimum} onChangeText={setMinimum} maxLength={15} placeholder="0" editable={!create.isPending} />
    <AppText variant="caption">{t('couponManager.duration')}</AppText>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs }}>
      {[1, 7, 30, 0].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: days === value }}
        disabled={create.isPending} onPress={() => setDays(value)}
        style={{ minHeight: tokens.layout.minTouchTarget, justifyContent: 'center', paddingHorizontal: tokens.spacing.md, borderRadius: tokens.radius.pill,
          backgroundColor: days === value ? tokens.color.brand.primary : tokens.color.surface.mint }}>
        <AppText color={days === value ? tokens.color.text.onBrand : tokens.color.text.primary}>{value ? t('couponManager.days', { count: String(value) }) : t('couponManager.unlimited')}</AppText>
      </Pressable>)}
    </View>
    <AppText variant="muted">{t('couponManager.conditions')}</AppText>
    <CompletionError error={create.error} />
    <Button label={t('manage.createCoupon')} disabled={!valid} loading={create.isPending} onPress={() => create.mutate()} />
  </CompletionCard>;
}
