import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { AppState, StyleSheet, View } from "react-native";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Appear, Expandable } from "@/components/motion";
import { useAuthStore } from "@/store/auth-store";
import { t } from "@/i18n";
import { tokens } from "@/theme";
import { offlineScope, queueItems, synchronize, discard } from "./queue";
import { clearScope } from "./storage";

export function OfflineSync() {
  const client = useQueryClient();
  useEffect(() => {
    const tick = async () => {
      try {
        if (await synchronize())
          await client.invalidateQueries({ queryKey: ["merchant"] });
        await client.invalidateQueries({ queryKey: ["offline-queue"] });
      } catch {
        /* The queue view reports storage failures. */
      }
    };
    const unsubscribe = useAuthStore.subscribe((next, previous) => {
      if (
        previous.sessionScope &&
        previous.organizationId &&
        !next.sessionScope
      ) {
        void clearScope(
          `${previous.sessionScope}:${previous.organizationId}`,
        ).catch(() => undefined);
      }
    });
    void tick();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void tick();
    }, 3000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void tick();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
      unsubscribe();
    };
  }, [client]);
  return null;
}
export function QueuePanel({ compact = false }: { compact?: boolean }) {
  const session = useAuthStore((s) => s.sessionScope);
  const organization = useAuthStore((s) => s.organizationId);
  const scope = session && organization ? `${session}:${organization}` : null;
  const client = useQueryClient();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["offline-queue", scope],
    queryFn: () => queueItems(scope!),
    enabled: Boolean(scope),
    refetchInterval: 3000,
    networkMode: "always",
  });
  if (!scope) return null;
  if (compact)
    return (
      <Expandable open={Boolean(list.data?.length)}>
        {list.data?.length ? (
          <View style={styles.banner}>
            <Ionicons
              name="cloud-upload-outline"
              size={16}
              color={tokens.color.feedback.warning}
            />
            <AppText variant="caption" color={tokens.color.feedback.warning} style={styles.bannerLabel}>
              {t("offlineQueue.count", { count: String(list.data.length) })}
            </AppText>
          </View>
        ) : null}
      </Expandable>
    );
  const items = [...(list.data ?? [])].sort(
    (a, b) => a.createdAt - b.createdAt,
  );
  const settled = list.isSuccess && items.length === 0;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.mark}>
          <Appear key={settled ? "settled" : "pending"}>
            <Ionicons
              name={settled ? "checkmark" : "cloud-upload-outline"}
              size={18}
              color={tokens.color.brand.primary}
            />
          </Appear>
        </View>
        <View style={styles.headBody}>
          <AppText variant="subtitle">{t("offlineQueue.title")}</AppText>
          {/* Nothing waiting: one line is enough, the explanation only matters when something is pending. */}
          <Appear key={settled ? "empty" : list.isError ? "unavailable" : "hint"}>
            <AppText variant="muted">
              {settled
                ? t("offlineQueue.empty")
                : list.isError
                  ? t("offlineQueue.unavailable")
                  : t("offlineQueue.hint")}
            </AppText>
          </Appear>
        </View>
      </View>
      {items.map((item) => (
        <Appear key={item.id} style={styles.item}>
          <AppText style={styles.itemTitle}>
            {t(`offlineQueue.${item.action.kind}`)} ·{" "}
            {t(`offlineQueue.${item.status}`)}
          </AppText>
          <AppText variant="caption">
            {new Date(item.createdAt).toLocaleString("fr-FR")}
          </AppText>
          {item.action.kind === "expense" ? (
            <AppText>
              {item.action.label} · {item.action.amount} FCFA
            </AppText>
          ) : null}
          {item.action.kind === "order" ? (
            <AppText>
              {item.action.customerName} · {item.action.expectedTotalAmount}{" "}
              FCFA
            </AppText>
          ) : null}
          {item.error ? (
            <Appear>
              <AppText color={tokens.color.feedback.error}>{item.error}</AppText>
            </Appear>
          ) : null}
          {confirm === item.id ? (
            <Appear>
              <AppText variant="muted">{t("offlineQueue.discardHint")}</AppText>
            </Appear>
          ) : null}
          <Button
            variant="outline"
            label={t(
              confirm === item.id
                ? "offlineQueue.confirmDiscard"
                : "offlineQueue.discard",
            )}
            onPress={async () => {
              if (confirm !== item.id) {
                setConfirm(item.id);
                return;
              }
              try {
                if (scope !== offlineScope()) return;
                await discard(item.id);
                setConfirm(null);
                await client.invalidateQueries({ queryKey: ["offline-queue"] });
              } catch {
                setError(t("offlineQueue.unavailable"));
              }
            }}
          />
        </Appear>
      ))}
      {error ? (
        <Appear>
          <AppText color={tokens.color.feedback.error}>{error}</AppText>
        </Appear>
      ) : null}
      {items.length > 0 ? (
        <Appear>
          <AppText variant="caption" color={tokens.color.feedback.warning}>
            {t("offlineQueue.signOut")}
          </AppText>
        </Appear>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.layout.screenPadding,
    paddingVertical: tokens.spacing.xs,
    backgroundColor: tokens.color.surface.white,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border.default,
  },
  bannerLabel: { flex: 1, fontFamily: tokens.typography.family.semibold },
  card: {
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
  },
  head: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm },
  headBody: { flex: 1, gap: 2 },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.surface.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  item: {
    gap: tokens.spacing.xs,
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border.default,
  },
  itemTitle: {
    fontFamily: tokens.typography.family.semibold,
    color: tokens.color.brand.deep,
  },
});
