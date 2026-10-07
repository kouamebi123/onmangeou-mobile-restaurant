import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  changeMerchantOrderStatus,
  createManualOrder,
  fetchMerchantOrders,
  fetchProducts,
  type MerchantOrder,
  type MerchantOrderStatus,
} from "@/api/merchant";
import { ApiError } from "@/api/envelope";
import { hapticLight, hapticSuccess, hapticWarning } from "@/feedback/haptics";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Appear } from "@/components/motion";
import { PageHero } from "@/components/page-hero";
import { Price } from "@/components/price";
import { Screen } from "@/components/screen";
import { Skeleton } from "@/components/skeleton";
import { StatusChip } from "@/components/status-chip";
import { t } from "@/i18n";
import { useMerchantStore } from "@/store/merchant-store";
import { tokens } from "@/theme";

import {
  ORDER_FILTERS,
  countByFilter,
  elapsedMinutes,
  isActive,
  isLate,
  matchesFilter,
  sortQueue,
  statusTone,
  type OrderFilter,
} from "./order-queue";

const NEXT_ACTIONS: Record<
  MerchantOrderStatus,
  Array<{
    status: Exclude<
      MerchantOrderStatus,
      "PENDING_PAYMENT" | "PENDING_RESTAURANT" | "CANCELLED"
    >;
    label: string;
    variant?: "primary" | "outline" | "destructive";
  }>
> = {
  PENDING_PAYMENT: [],
  PENDING_RESTAURANT: [
    { status: "ACCEPTED", label: "orders.accept" },
    { status: "REJECTED", label: "orders.reject", variant: "destructive" },
  ],
  ACCEPTED: [{ status: "PREPARING", label: "orders.prepare" }],
  PREPARING: [{ status: "READY", label: "orders.ready" }],
  READY: [{ status: "COMPLETED", label: "orders.complete" }],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function OrdersScreen() {
  const queryClient = useQueryClient();
  const selectedId = useMerchantStore((state) => state.selectedEstablishmentId);
  const [filter, setFilter] = useState<OrderFilter>("all");

  const orders = useQuery({
    queryKey: ["merchant", "orders", selectedId],
    queryFn: () => fetchMerchantOrders(selectedId ?? undefined),
    refetchInterval: 8000,
  });

  const products = useQuery({
    queryKey: ["merchant", "products", selectedId],
    queryFn: () => fetchProducts(selectedId ?? ""),
    enabled: Boolean(selectedId),
  });

  const change = useMutation({
    mutationFn: (input: {
      orderId: string;
      status: Exclude<
        MerchantOrderStatus,
        "PENDING_PAYMENT" | "PENDING_RESTAURANT" | "CANCELLED"
      >;
    }) => changeMerchantOrderStatus(input.orderId, input.status),
    onSuccess: () => {
      hapticSuccess();
      void queryClient.invalidateQueries({ queryKey: ["merchant", "orders"] });
    },
  });

  const walkIn = useMutation({
    networkMode: "always",
    mutationFn: () => {
      const product = products.data?.[0];
      if (!selectedId || !product) {
        throw new Error(t("orders.noProduct"));
      }
      return createManualOrder({
        establishmentId: selectedId,
        customerName: t("orders.walkInCustomer"),
        items: [{ productId: product.id, quantity: 1 }],
        service: "DINE_IN",
        expectedTotalAmount: product.price.amount,
      });
    },
    onSuccess: () => {
      hapticSuccess();
      void queryClient.invalidateQueries({ queryKey: ["merchant", "orders"] });
    },
  });

  const counts = useMemo(() => countByFilter(orders.data ?? []), [orders.data]);
  const visible = useMemo(
    () =>
      sortQueue(orders.data ?? []).filter((order) =>
        matchesFilter(order.status, filter),
      ),
    [orders.data, filter],
  );
  // L'heure du dernier relevé sert d'horloge : les délais affichés suivent le rafraîchissement.
  const now = useMemo(
    () => new Date(orders.dataUpdatedAt || Date.now()),
    [orders.dataUpdatedAt],
  );

  return (
    <Screen>
      <PageHero
        icon="receipt-outline"
        kicker={t("app.name")}
        title={t("tabs.orders")}
        subtitle={t("orders.hero")}
      />
      {orders.data && orders.data.length > 0 ? (
        <Appear>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filters}
            contentContainerStyle={styles.filtersRow}
          >
            {ORDER_FILTERS.map((entry) => {
              const selected = entry === filter;
              const count = counts[entry];
              return (
                <Pressable
                  key={entry}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${t(`orders.filters.${entry}`)} (${count})`}
                  onPress={() => {
                    hapticLight();
                    setFilter(entry);
                  }}
                  style={[styles.filterChip, selected ? styles.filterChipOn : null]}
                >
                  <AppText
                    variant="caption"
                    color={
                      selected
                        ? tokens.color.text.onBrand
                        : tokens.color.brand.deep
                    }
                    style={styles.strong}
                  >
                    {t(`orders.filters.${entry}`)}
                  </AppText>
                  <View
                    style={[
                      styles.filterCount,
                      selected ? styles.filterCountOn : null,
                      entry === "todo" && count > 0 && !selected
                        ? styles.filterCountAlert
                        : null,
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={
                        selected || (entry === "todo" && count > 0)
                          ? tokens.color.text.onBrand
                          : tokens.color.text.muted
                      }
                      style={styles.strong}
                    >
                      {count}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Appear>
      ) : null}
      {selectedId && products.data?.[0] ? (
        <Appear>
          <Button
            label={t("orders.walkIn", { name: products.data[0].name })}
            variant="outline"
            loading={walkIn.isPending}
            onPress={() => walkIn.mutate()}
          />
        </Appear>
      ) : null}

      {walkIn.isSuccess ? (
        <Appear>
          <AppText>{t("offlineQueue.saved")}</AppText>
        </Appear>
      ) : null}
      {walkIn.isError ? (
        <Appear>
          <AppText color={tokens.color.feedback.error}>
            {walkIn.error.message}
          </AppText>
        </Appear>
      ) : null}
      {orders.isLoading ? <Skeleton height={140} /> : null}
      {orders.isError ? (
        <ErrorState onRetry={() => void orders.refetch()} />
      ) : null}
      {orders.data && orders.data.length === 0 ? (
        <EmptyState
          title={t("orders.empty")}
          detail={t("orders.emptyDetail")}
        />
      ) : null}

      {change.error instanceof ApiError ? (
        <Appear>
          <AppText color={tokens.color.feedback.error}>
            {change.error.problem.detail}
          </AppText>
        </Appear>
      ) : null}

      {/* La liste se fond à chaque changement de filtre. Un ticket garde sa clé :
          il ne rejoue rien au relevé (toutes les 8 s) ni au changement d'état. */}
      {orders.data && orders.data.length > 0 ? (
        <Appear key={filter}>
          {visible.length === 0 ? (
            <Appear>
              <AppText variant="muted" style={styles.filterEmpty}>
                {t("orders.filterEmpty")}
              </AppText>
            </Appear>
          ) : null}
          {visible.map((order) => (
            <Appear key={order.id}>
              <TicketCard
                order={order}
                now={now}
                busy={change.isPending}
                onAction={(status) =>
                  change.mutate({ orderId: order.id, status })
                }
              />
            </Appear>
          ))}
        </Appear>
      ) : null}
    </Screen>
  );
}

function waitLabel(order: MerchantOrder, now: Date): string {
  const minutes = elapsedMinutes(order.placedAt, now);
  if (isLate(order.status, order.placedAt, now) && minutes < 60) {
    return t("orders.late", { minutes: String(minutes) });
  }
  if (minutes < 1) return t("orders.receivedNow");
  if (minutes < 60) return t("orders.receivedAgo", { minutes: String(minutes) });
  if (minutes < 24 * 60) {
    return t("orders.receivedHoursAgo", { hours: String(Math.floor(minutes / 60)) });
  }
  return t("orders.receivedOn", {
    date: new Intl.DateTimeFormat("fr-CI", {
      timeZone: order.timezone ?? "Africa/Abidjan",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(order.placedAt)),
  });
}

function TicketCard({
  order,
  now,
  busy,
  onAction,
}: {
  order: MerchantOrder;
  now: Date;
  busy: boolean;
  onAction: (
    status: Exclude<
      MerchantOrderStatus,
      "PENDING_PAYMENT" | "PENDING_RESTAURANT" | "CANCELLED"
    >,
  ) => void;
}) {
  const actions = NEXT_ACTIONS[order.status].filter(
    (action) => order.service !== "DELIVERY" || action.status !== "COMPLETED",
  );
  const [confirmingReject, setConfirmingReject] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (confirmTimer.current) {
        clearTimeout(confirmTimer.current);
      }
    },
    [],
  );

  const handleAction = (
    status: Exclude<
      MerchantOrderStatus,
      "PENDING_PAYMENT" | "PENDING_RESTAURANT" | "CANCELLED"
    >,
  ) => {
    if (status === "REJECTED" && !confirmingReject) {
      hapticWarning();
      setConfirmingReject(true);
      confirmTimer.current = setTimeout(() => setConfirmingReject(false), 4000);
      return;
    }
    if (confirmTimer.current) {
      clearTimeout(confirmTimer.current);
    }
    setConfirmingReject(false);
    onAction(status);
  };

  const active = isActive(order.status);
  const late = isLate(order.status, order.placedAt, now);
  const serviceLabel = t(`orders.service.${order.service}`);
  const service = serviceLabel.startsWith("orders.service.") ? null : serviceLabel;

  return (
    <View
      style={[
        styles.card,
        order.status === "PENDING_RESTAURANT" ? styles.cardPending : null,
        active ? null : styles.cardDone,
      ]}
    >
      <View style={styles.head}>
        <View style={styles.headBody}>
          <AppText variant="subtitle">{order.customerName}</AppText>
          <AppText variant="muted">
            {[order.publicRef, service].filter(Boolean).join(" · ")}
          </AppText>
        </View>
        <StatusChip
          label={t(`orders.status.${order.status}`)}
          tone={statusTone(order.status)}
        />
      </View>

      <View style={styles.metaRow}>
        <Ionicons
          name={order.scheduledFor ? "calendar-outline" : "time-outline"}
          size={15}
          color={late ? tokens.color.feedback.error : tokens.color.text.muted}
        />
        <AppText
          variant="muted"
          color={late ? tokens.color.feedback.error : undefined}
          style={styles.metaText}
        >
          {order.scheduledFor
            ? t("schedule.requested", {
                date: new Intl.DateTimeFormat("fr-CI", {
                  timeZone: order.timezone ?? "Africa/Abidjan",
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(order.scheduledFor)),
              })
            : active
              ? waitLabel(order, now)
              : new Intl.DateTimeFormat("fr-CI", {
                  timeZone: order.timezone ?? "Africa/Abidjan",
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(order.placedAt))}
        </AppText>
      </View>

      <View style={styles.items}>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <AppText style={styles.itemQty}>{item.quantity} ×</AppText>
            <AppText style={styles.itemName}>{item.name}</AppText>
          </View>
        ))}
      </View>

      {order.notes ? (
        <View style={styles.note}>
          <AppText variant="muted">
            {t("orders.notes")} : {order.notes}
          </AppText>
        </View>
      ) : null}

      {order.couponCode && order.discount && order.subtotal ? (
        <View style={styles.totalRow}>
          <AppText variant="muted">
            {t("couponManager.subtotal")}: {order.subtotal.formatted}
          </AppText>
          <AppText variant="muted">
            {t("couponManager.discount", { code: order.couponCode })}: −
            {order.discount.formatted}
          </AppText>
        </View>
      ) : null}

      <View style={styles.totalRow}>
        <AppText variant="muted">{t("orders.total")}</AppText>
        <Price value={order.total} />
      </View>

      {active && order.customerPhone ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t("orders.callLabel", { name: order.customerName })}
          onPress={() => void Linking.openURL(`tel:${order.customerPhone}`).catch(() => undefined)}
          style={styles.call}
        >
          <Ionicons name="call-outline" size={16} color={tokens.color.brand.primary} />
          <AppText color={tokens.color.brand.primary} style={styles.strong}>
            {t("orders.call")}
          </AppText>
          <AppText variant="muted">{order.customerPhone}</AppText>
        </Pressable>
      ) : null}

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Button
              key={action.status}
              label={
                action.status === "REJECTED" && confirmingReject
                  ? t("orders.rejectConfirm")
                  : t(action.label)
              }
              variant={action.variant ?? "primary"}
              loading={busy}
              onPress={() => handleAction(action.status)}
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
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.spacing.sm,
  },
  headBody: { flex: 1, gap: 2 },
  cardPending: {
    borderLeftWidth: 4,
    borderLeftColor: tokens.color.brand.accent,
  },
  cardDone: { shadowOpacity: 0, backgroundColor: tokens.color.brand.cream },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { flex: 1 },
  items: { gap: 2 },
  itemRow: { flexDirection: "row", gap: tokens.spacing.xs },
  itemQty: {
    minWidth: 30,
    fontFamily: tokens.typography.family.semibold,
    fontVariant: ["tabular-nums"],
  },
  itemName: { flex: 1 },
  note: {
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.brand.cream,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.sm,
    paddingTop: tokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border.default,
  },
  call: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    minHeight: tokens.layout.minTouchTarget,
  },
  actions: { flexDirection: "row", gap: tokens.spacing.sm },
  action: { flex: 1 },
  filters: { flexGrow: 0 },
  filtersRow: { gap: tokens.spacing.xs, paddingVertical: 2 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    minHeight: 40,
    paddingLeft: tokens.spacing.md,
    paddingRight: tokens.spacing.xs,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    backgroundColor: tokens.color.surface.white,
  },
  filterChipOn: {
    backgroundColor: tokens.color.brand.primary,
    borderColor: tokens.color.brand.primary,
  },
  filterCount: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.color.brand.cream,
  },
  filterCountOn: { backgroundColor: tokens.color.brand.deep },
  filterCountAlert: { backgroundColor: tokens.color.brand.accent },
  filterEmpty: { textAlign: "center", paddingVertical: tokens.spacing.lg },
  strong: { fontFamily: tokens.typography.family.semibold },
});
