import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { fetchEntitlements, setMerchantModules } from '@/api/merchant';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { PageHero } from '@/components/page-hero';
import { Screen } from '@/components/screen';
import { Tap } from '@/components/tap';
import { MODULE_COPY } from '@/features/plan/module-copy';
import { quoteModules } from '@/features/onboarding/restaurant-place';
import { t } from '@/i18n';
import { tokens } from '@/theme';

export function PlanScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const entitlements = useQuery({ queryKey: ['merchant', 'entitlements'], queryFn: () => fetchEntitlements() });
  const [draft, setDraft] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!entitlements.data) {
      return;
    }
    setDraft(Object.fromEntries(entitlements.data.modules.map((module) => [module.code, module.enabled])));
  }, [entitlements.data]);

  const selectedCount = useMemo(() => Object.values(draft).filter(Boolean).length, [draft]);
  const dirty = useMemo(() => {
    if (!entitlements.data) {
      return false;
    }
    return entitlements.data.modules.some((module) => draft[module.code] !== module.enabled);
  }, [draft, entitlements.data]);

  const save = useMutation({
    mutationFn: () =>
      setMerchantModules(
        Object.entries(draft).map(([code, enabled]) => ({ code, enabled })),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['merchant', 'entitlements'] });
    },
  });

  return (
    <Screen>
      <PageHero
        icon="diamond-outline"
        kicker={t('plan.kicker')}
        title={t('plan.title')}
        subtitle={t('plan.subtitle')}
      />
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />

      {entitlements.isError ? <ErrorState onRetry={() => void entitlements.refetch()} /> : null}

      {entitlements.data ? (
        <View style={styles.summary}>
          <AppText variant="caption" color={tokens.color.brand.accent} style={styles.kicker}>
            {entitlements.data.planCode ?? t('plan.custom')}
          </AppText>
          <AppText variant="title" color={tokens.color.text.onBrand} style={styles.summaryTitle}>
            {dirty
              ? quoteModules(
                  entitlements.data.catalog,
                  Object.entries(draft)
                    .filter(([, enabled]) => enabled)
                    .map(([code]) => code),
                )
              : (entitlements.data.monthlyQuote?.formatted ?? t('plan.activeCount', { count: String(selectedCount) }))}
          </AppText>
          <AppText variant="muted" color={tokens.color.surface.mint}>
            {t('plan.quoteHint', { count: String(selectedCount) })}
          </AppText>
          <AppText variant="muted" color={tokens.color.surface.mint}>
            {entitlements.data.subscriptionStatus
              ? t(`plan.status.${entitlements.data.subscriptionStatus}`)
              : t('plan.status.NONE')}
          </AppText>
        </View>
      ) : null}

      {entitlements.data?.modules.map((module) => {
        const copy = MODULE_COPY[module.code];
        const enabled = draft[module.code] ?? module.enabled;
        const locked = module.code === 'storefront.basic';
        const price = entitlements.data.catalog?.modules.find((entry) => entry.code === module.code)?.monthlyPrice;
        return (
          <Tap
            key={module.code}
            disabled={locked || save.isPending}
            checked={enabled}
            onPress={() => setDraft((current) => ({ ...current, [module.code]: !enabled }))}
            style={[styles.row, enabled ? styles.rowOn : null]}
          >
            <View style={styles.rowBody}>
              <AppText variant="subtitle">{copy?.title ?? module.label}</AppText>
              <AppText variant="muted">{copy?.detail ?? module.label}</AppText>
              {locked ? (
                <AppText variant="caption" color={tokens.color.brand.primary}>
                  {t('plan.included')}
                </AppText>
              ) : (
                <AppText variant="caption">{price?.formatted ?? '—'}/mois</AppText>
              )}
            </View>
            <View style={[styles.switch, enabled ? styles.switchOn : null]}>
              <Ionicons
                name={enabled ? 'checkmark' : 'remove'}
                size={16}
                color={enabled ? tokens.color.text.onBrand : tokens.color.text.muted}
              />
            </View>
          </Tap>
        );
      })}

      {save.isError ? (
        <AppText color={tokens.color.feedback.error}>
          {save.error instanceof ApiError ? save.error.problem.detail : t('errors.generic')}
        </AppText>
      ) : null}
      {save.isSuccess && !dirty ? (
        <AppText color={tokens.color.feedback.success}>{t('plan.saved')}</AppText>
      ) : null}
      <Button
        label={t('plan.save')}
        loading={save.isPending}
        disabled={!dirty}
        onPress={() => save.mutate()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: tokens.spacing.xs,
    padding: tokens.spacing.lg,
    backgroundColor: tokens.color.brand.deep,
    borderRadius: tokens.radius.card,
  },
  kicker: {
    fontFamily: tokens.typography.family.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  summaryTitle: { color: tokens.color.text.onBrand, fontSize: tokens.typography.size.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    padding: tokens.spacing.md,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
  },
  rowOn: { borderColor: tokens.color.brand.primary, backgroundColor: tokens.color.surface.mint },
  rowBody: { flex: 1, gap: 4 },
  switch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.surface.white,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
  },
  switchOn: { backgroundColor: tokens.color.brand.primary, borderColor: tokens.color.brand.primary },
});
