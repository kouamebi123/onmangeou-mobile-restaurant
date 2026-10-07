import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  fetchEntitlements,
  fetchEstablishments,
  fetchMerchantOrders,
  fetchMerchantReservations,
  fetchProducts,
  hasModule,
  MODULE_CODES,
} from '@/api/merchant';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Appear } from '@/components/motion';
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

  const entitlements = useQuery({
    queryKey: ['merchant', 'entitlements'],
    queryFn: () => fetchEntitlements(),
  });
  const canReserve = hasModule(entitlements.data?.enabledModules ?? [], MODULE_CODES.RESERVATIONS_TABLES);
  // Same cache key and rhythm as the reservation panel in Gestion.
  const reservations = useQuery({
    queryKey: ['merchant', 'reservations', selectedId],
    queryFn: () => fetchMerchantReservations(selectedId ?? undefined),
    enabled: Boolean(selectedId) && canReserve,
    refetchInterval: 15000,
  });
  const pendingReservations = (reservations.data ?? []).filter((item) => item.status === 'REQUESTED').length;

  const list = establishments.data ?? [];
  const selected = list.find((item) => item.id === selectedId) ?? list[0];
  const productList = products.data ?? [];
  const unavailable = productList.filter((item) => item.availability !== 'AVAILABLE').length;
  const openTickets = (orders.data ?? []).filter((order) =>
    ['PENDING_RESTAURANT', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status),
  ).length;
  const metricsLoading = products.isLoading || orders.isLoading;
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
        <Appear>
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
        </Appear>
      ) : null}

      {list.length > 0 ? (
        <Appear index={1}>
          <View style={styles.metrics}>
            <Metric
              value={metricsLoading ? '—' : String(openTickets)}
              label={t('activity.tickets')}
              loading={metricsLoading}
            />
            <Metric
              value={metricsLoading ? '—' : String(productList.length)}
              label={t('activity.products')}
              loading={metricsLoading}
            />
            <Metric
              value={metricsLoading ? '—' : String(unavailable)}
              label={t('activity.unavailable')}
              loading={metricsLoading}
            />
          </View>
        </Appear>
      ) : null}

      {list.length > 0 ? (
        <Appear index={2}>
          <View style={styles.soon}>
            <View style={styles.soonMark}>
              <Ionicons name="receipt" size={28} color={tokens.color.text.onBrand} />
            </View>
            <AppText variant="caption" color={tokens.color.brand.accent} style={styles.soonKicker}>
              {t('activity.ordersTitle')}
            </AppText>
            <Appear key={metricsLoading ? 'loading' : 'value'}>
              <AppText variant="subtitle" style={styles.center}>
                {metricsLoading ? t('common.loading') : openTickets > 0 ? String(openTickets) : t('orders.empty')}
              </AppText>
            </Appear>
            <AppText variant="muted" style={styles.center}>
              {t('activity.ordersDetail')}
            </AppText>
            <Button label={t('activity.openOrders')} onPress={() => router.push('/orders')} />
          </View>
        </Appear>
      ) : null}

      {list.length > 0 && canReserve ? (
        <Appear index={3}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('activity.openReservations')}
            onPress={() => router.push('/manage?section=service')}
            style={[styles.card, pendingReservations > 0 ? styles.attention : null]}
          >
            <View style={styles.cardHead}>
              <View style={styles.mark}>
                <Ionicons name="calendar-outline" size={18} color={tokens.color.brand.primary} />
              </View>
              <View style={styles.cardBody}>
                <Appear key={reservations.isLoading ? 'loading' : 'value'}>
                  <AppText variant="subtitle">
                    {reservations.isLoading
                      ? t('common.loading')
                      : pendingReservations > 0
                        ? t('activity.reservationsPending', { count: String(pendingReservations) })
                        : t('activity.reservationsNone')}
                  </AppText>
                </Appear>
                <AppText variant="muted">{t('activity.reservationsDetail')}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tokens.color.text.muted} />
            </View>
          </Pressable>
        </Appear>
      ) : null}

      {list.length > 0 ? (
        <Appear index={4}>
          <View style={styles.actions}>
            <Button label={t('activity.openCatalog')} onPress={() => router.push('/catalog')} />
            <Button
              label={t('activity.openManage')}
              variant="primary"
              onPress={() => router.push('/manage')}
            />
          </View>
        </Appear>
      ) : null}

      {list.length > 1
        ? list.map((item, index) => (
            <Appear key={item.id} index={index}>
              <Pressable
                onPress={() => setSelectedId(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: item.id === selectedId }}
                style={[styles.card, item.id === selectedId ? styles.selected : null]}
              >
                <AppText variant="subtitle">{item.name}</AppText>
                <AppText variant="muted">
                  {item.status === 'PUBLISHED' ? t('activity.published') : t('activity.draft')}
                </AppText>
              </Pressable>
            </Appear>
          ))
        : null}
    </Screen>
  );
}

function Metric({ value, label, loading }: { value: string; label: string; loading: boolean }) {
  return (
    <View style={styles.metric}>
      {/* Le chiffre remplace le tiret d'attente en fondu, sans rejouer à chaque relevé. */}
      <Appear key={loading ? 'loading' : 'value'}>
        <AppText variant="title">{value}</AppText>
      </Appear>
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
  attention: { borderColor: tokens.color.brand.accent, borderWidth: 2 },
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
