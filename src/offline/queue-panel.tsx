import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
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
    return list.data?.length ? (
      <AppText variant="caption">
        {t("offlineQueue.count", { count: String(list.data.length) })}
      </AppText>
    ) : null;
  const items = [...(list.data ?? [])].sort(
    (a, b) => a.createdAt - b.createdAt,
  );
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <AppText variant="subtitle">{t("offlineQueue.title")}</AppText>
      <AppText variant="muted">{t("offlineQueue.hint")}</AppText>
      {list.isError ? <AppText>{t("offlineQueue.unavailable")}</AppText> : null}
      {list.isSuccess && !items.length ? (
        <AppText>{t("offlineQueue.empty")}</AppText>
      ) : null}
      {items.map((item) => (
        <View key={item.id} style={{ gap: tokens.spacing.xs }}>
          <AppText>
            {t(`offlineQueue.${item.action.kind}`)} ·{" "}
            {t(`offlineQueue.${item.status}`)}
          </AppText>
          <AppText variant="caption">
            {new Date(item.createdAt).toLocaleString("fr-CI")} ·{" "}
            {item.action.establishmentId}
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
          {item.error ? <AppText>{item.error}</AppText> : null}
          {confirm === item.id ? (
            <AppText>{t("offlineQueue.discardHint")}</AppText>
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
        </View>
      ))}
      {error ? <AppText>{error}</AppText> : null}
      <AppText variant="caption">{t("offlineQueue.signOut")}</AppText>
    </View>
  );
}
