import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { fetchEstablishments, fetchMerchantOrders, fetchProducts } from '@/api/merchant';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHero } from '@/components/page-hero';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { t } from '@/i18n';
import { useMerchantStore } from '@/store/merchant-store';
import { tokens } from '@/theme';

export function ActivityScreen() {
  const router = useRouter();
  const selectedId = useMerchantStore((state) => state.selectedEstablishmentId);
  const setSelectedId = useMerchantStore((state) => state.setSelectedEstablishmentId);

  const establishments = useQuery({
    queryKey: ['merchant', 'establishments'],
    queryFn: fetchEstablishments,
  });

  useEffect(() => {
    const first = establishments.data?.[0];
    if (!selectedId && first) {
      setSelectedId(first.id);
    }
  }, [establishments.data, selectedId, setSelectedId]);

  const products = useQuery({
    queryKey: ['merchant', 'products', selectedId],
    queryFn: () => fetchProducts(selectedId ?? ''),
    enabled: Boolean(selectedId),
  });

  const orders = useQuery({
    queryKey: ['merchant', 'orders', selectedId],
    queryFn: () => fetchMerchantOrders(selectedId ?? undefined),
    enabled: Boolean(selectedId),
    refetchInterval: 8000,
  });

  const list = establishments.data ?? [];
  const selected = list.find((item) => item.id === selectedId) ?? list[0];
  const productList = products.data ?? [];
  const unavailable = productList.filter((item) => item.availability !== 'AVAILABLE').length;
  const openTickets = (orders.data ?? []).filter((order) =>
    ['PENDING_RESTAURANT', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status),
  ).length;
  const location = selected ? [selected.district, selected.city].filter(Boolean).join(' · ') : t('activity.subtitle');

  return (
    <Screen>
      <PageHero
        icon="pulse"
        kicker={t('activity.greeting')}
        title={selected?.name ?? t('activity.title')}
        subtitle={location}
      />

      {establishments.isLoading ? <Skeleton height={120} /> : null}
      {establishments.isError ? <ErrorState onRetry={() => void establishments.refetch()} /> : null}

      {establishments.data && list.length === 0 ? (
        <EmptyState
          title={t('empty.organization')}
          detail={t('empty.organizationDetail')}
          actionLabel={t('activity.openManage')}
          onAction={() => router.push('/manage')}
        />
      ) : null}

      {selected ? (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.mark}>
              <Ionicons name="storefront-outline" size={18} color={tokens.color.brand.primary} />
            </View>
            <View style={styles.cardBody}>
              <AppText variant="subtitle">{selected.name}</AppText>
              <AppText variant="muted">{location}</AppText>
            </View>
            <View style={[styles.badge, selected.status === 'PUBLISHED' ? styles.badgeOn : styles.badgeOff]}>
              <AppText
                variant="caption"
                color={selected.status === 'PUBLISHED' ? tokens.color.brand.primary : tokens.color.text.muted}
              >
                {selected.status === 'PUBLISHED' ? t('activity.published') : t('activity.draft')}
              </AppText>
            </View>
          </View>
        </View>
      ) : null}

      {list.length > 0 ? (
        <View style={styles.metrics}>
          <Metric value={String(openTickets)} label={t('activity.tickets')} />
          <Metric value={String(productList.length)} label={t('activity.products')} />
          <Metric value={String(unavailable)} label={t('activity.unavailable')} />
        </View>
      ) : null}

      {list.length > 0 ? (
        <View style={styles.soon}>
          <View style={styles.soonMark}>
            <Ionicons name="receipt" size={28} color={tokens.color.text.onBrand} />
          </View>
          <AppText variant="caption" color={tokens.color.brand.accent} style={styles.soonKicker}>
            {t('activity.ordersTitle')}
          </AppText>
          <AppText variant="subtitle" style={styles.center}>
            {openTickets > 0 ? String(openTickets) : t('orders.empty')}
          </AppText>
          <AppText variant="muted" style={styles.center}>
            {t('activity.ordersDetail')}
          </AppText>
          <Button label={t('activity.openOrders')} onPress={() => router.push('/orders')} />
        </View>
      ) : null}

      {list.length > 0 ? (
        <View style={styles.actions}>
          <Button label={t('activity.openCatalog')} onPress={() => router.push('/catalog')} />
          <Button
            label={t('activity.openManage')}
            variant="outline"
            onPress={() => router.push('/manage')}
          />
        </View>
      ) : null}

      {list.length > 1
        ? list.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedId(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: item.id === selectedId }}
              style={[styles.card, item.id === selectedId ? styles.selected : null]}
            >
              <AppText variant="subtitle">{item.name}</AppText>
              <AppText variant="muted">{item.status === 'PUBLISHED' ? t('activity.published') : t('activity.draft')}</AppText>
            </Pressable>
          ))
        : null}
    </Screen>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="muted">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.spacing.xxs,
    padding: tokens.spacing.md,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  cardBody: { flex: 1, gap: 2 },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.surface.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
  },
  badgeOn: { backgroundColor: tokens.color.surface.mint },
  badgeOff: { backgroundColor: tokens.color.brand.cream },
  selected: { borderColor: tokens.color.brand.primary },
  metrics: { flexDirection: 'row', gap: tokens.spacing.sm },
  metric: {
    flex: 1,
    gap: tokens.spacing.xxs,
    padding: tokens.spacing.md,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
  },
  soon: {
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.lg,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  soonMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.color.brand.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soonKicker: {
    fontFamily: tokens.typography.family.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  center: { textAlign: 'center' },
  actions: { gap: tokens.spacing.sm },
});
