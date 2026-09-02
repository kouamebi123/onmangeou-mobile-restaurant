import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  changeMerchantOrderStatus,
  createManualOrder,
  fetchMerchantOrders,
  fetchProducts,
  type MerchantOrder,
  type MerchantOrderStatus,
} from '@/api/merchant';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHero } from '@/components/page-hero';
import { Price } from '@/components/price';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { t } from '@/i18n';
import { useMerchantStore } from '@/store/merchant-store';
import { tokens } from '@/theme';

const NEXT_ACTIONS: Record<
  MerchantOrderStatus,
  Array<{ status: Exclude<MerchantOrderStatus, 'PENDING_PAYMENT' | 'PENDING_RESTAURANT' | 'CANCELLED'>; label: string; variant?: 'primary' | 'outline' | 'destructive' }>
> = {
  PENDING_PAYMENT: [],
  PENDING_RESTAURANT: [
    { status: 'ACCEPTED', label: 'orders.accept' },
    { status: 'REJECTED', label: 'orders.reject', variant: 'destructive' },
  ],
  ACCEPTED: [{ status: 'PREPARING', label: 'orders.prepare' }],
  PREPARING: [{ status: 'READY', label: 'orders.ready' }],
  READY: [{ status: 'COMPLETED', label: 'orders.complete' }],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function OrdersScreen() {
  const queryClient = useQueryClient();
  const selectedId = useMerchantStore((state) => state.selectedEstablishmentId);
  const [kitchenOnly, setKitchenOnly] = useState(false);

  const orders = useQuery({
    queryKey: ['merchant', 'orders', selectedId],
    queryFn: () => fetchMerchantOrders(selectedId ?? undefined),
    refetchInterval: 8000,
  });

  const products = useQuery({
    queryKey: ['merchant', 'products', selectedId],
    queryFn: () => fetchProducts(selectedId ?? ''),
    enabled: Boolean(selectedId),
  });

  const change = useMutation({
    mutationFn: (input: { orderId: string; status: Exclude<MerchantOrderStatus, 'PENDING_PAYMENT' | 'PENDING_RESTAURANT' | 'CANCELLED'> }) =>
      changeMerchantOrderStatus(input.orderId, input.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['merchant', 'orders'] });
    },
  });

  const walkIn = useMutation({
    mutationFn: () => {
      const product = products.data?.[0];
      if (!selectedId || !product) {
        throw new Error('Aucun plat');
      }
      return createManualOrder({
        establishmentId: selectedId,
        customerName: 'Comptoir',
        items: [{ productId: product.id, quantity: 1 }],
        service: 'DINE_IN',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['merchant', 'orders'] });
    },
  });

  return (
    <Screen>
      <PageHero icon="receipt-outline" kicker={t('app.name')} title={t('tabs.orders')} subtitle={t('orders.hero')} />
      <Pressable onPress={() => setKitchenOnly((value) => !value)} style={styles.filter}>
        <AppText color={kitchenOnly ? tokens.color.brand.primary : tokens.color.text.muted}>
          {kitchenOnly ? 'File cuisine · en cours' : 'Toutes les commandes'}
        </AppText>
      </Pressable>
      {selectedId && products.data?.[0] ? (
        <Button
          label={`Ticket comptoir · ${products.data[0].name}`}
          variant="outline"
          loading={walkIn.isPending}
          onPress={() => walkIn.mutate()}
        />
      ) : null}

      {orders.isLoading ? <Skeleton height={140} /> : null}
      {orders.isError ? <ErrorState onRetry={() => void orders.refetch()} /> : null}
      {orders.data && orders.data.length === 0 ? (
        <EmptyState title={t('orders.empty')} detail={t('orders.emptyDetail')} />
      ) : null}

      {change.error instanceof ApiError ? (
        <AppText color={tokens.color.feedback.error}>{change.error.problem.detail}</AppText>
      ) : null}

      {orders.data
        ?.filter((order) => (kitchenOnly ? order.status === 'ACCEPTED' || order.status === 'PREPARING' : true))
        .map((order) => (
        <TicketCard
          key={order.id}
          order={order}
          busy={change.isPending}
          onAction={(status) => change.mutate({ orderId: order.id, status })}
        />
      ))}
    </Screen>
  );
}

function TicketCard({
  order,
  busy,
  onAction,
}: {
  order: MerchantOrder;
  busy: boolean;
  onAction: (status: Exclude<MerchantOrderStatus, 'PENDING_PAYMENT' | 'PENDING_RESTAURANT' | 'CANCELLED'>) => void;
}) {
  const actions = NEXT_ACTIONS[order.status].filter((action) => order.service !== 'DELIVERY' || action.status !== 'COMPLETED');

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headBody}>
          <AppText variant="subtitle">{order.customerName}</AppText>
          <AppText variant="muted">{order.publicRef}</AppText>
        </View>
        <View style={styles.badge}>
          <AppText variant="caption" color={tokens.color.brand.primary}>
            {t(`orders.status.${order.status}`)}
          </AppText>
        </View>
      </View>
      {order.items.map((item) => (
        <AppText key={item.id}>
          {item.quantity} × {item.name}
        </AppText>
      ))}
      {order.notes ? (
        <AppText variant="muted">
          {t('orders.notes')} : {order.notes}
        </AppText>
      ) : null}
      <Price value={order.total} />
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Button
              key={action.status}
              label={t(action.label)}
              variant={action.variant ?? 'primary'}
              loading={busy}
              onPress={() => onAction(action.status)}
              style={styles.action}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.spacing.sm,
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
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.spacing.sm },
  headBody: { flex: 1, gap: 2 },
  badge: {
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    backgroundColor: tokens.color.surface.mint,
  },
  actions: { flexDirection: 'row', gap: tokens.spacing.sm },
  action: { flex: 1 },
  filter: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.sm,
  },
});
