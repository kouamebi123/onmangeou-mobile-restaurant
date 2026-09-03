import { useEffect, useState } from "react";
import type { NotificationResponse } from "expo-notifications";
import { AppState, Platform, View } from "react-native";
import Constants from "expo-constants";
import { useRouter, useRootNavigationState } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { ApiError } from "@/api/envelope";
import { useAuthStore } from "@/store/auth-store";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { t } from "@/i18n";
import { tokens } from "@/theme";
import { kvGet, kvSet } from "@/store/kv-store";
import {
  currentPushPreference,
  changePushPreference,
  serializePushSubscription,
} from "./subscription-lock";

export function PushSettings({ headless = false }: { headless?: boolean }) {
  const scope = useAuthStore((s) => s.sessionScope);
  const organizationId = useAuthStore((s) => s.organizationId);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const router = useRouter();
  const navigationKey = useRootNavigationState()?.key;
  const unsupported =
    Platform.OS === "web" || Constants.appOwnership === "expo";
  async function register(prompt: boolean) {
    const preference = prompt
      ? changePushPreference()
      : currentPushPreference();
    if (!prompt && (await kvGet("push.disabled")) === "1") return;
    if (unsupported) {
      setMessage(t("push.developmentBuild"));
      return;
    }
    setBusy(true);
    try {
      const notifications = await import("expo-notifications");
      if (Platform.OS === "android")
        await notifications.setNotificationChannelAsync("commerce", {
          name: t("push.channel"),
          importance: notifications.AndroidImportance.HIGH,
        });
      let permission = await notifications.getPermissionsAsync();
      if (!permission.granted && prompt)
        permission = await notifications.requestPermissionsAsync();
      if (!permission.granted) {
        setMessage(t("push.denied"));
        return;
      }
      const projectId =
        Constants.easConfig?.projectId ??
        Constants.expoConfig?.extra?.eas?.projectId;
      if (typeof projectId !== "string") throw new Error("No project");
      const token = (await notifications.getExpoPushTokenAsync({ projectId }))
        .data;
      if (
        useAuthStore.getState().sessionScope !== scope ||
        useAuthStore.getState().organizationId !== organizationId
      )
        return;
      const registered = await serializePushSubscription(async () => {
        if (
          preference !== currentPushPreference() ||
          useAuthStore.getState().sessionScope !== scope ||
          useAuthStore.getState().organizationId !== organizationId
        )
          return false;
        if (!prompt && (await kvGet("push.disabled")) === "1") return false;
        await apiRequest("/me/push-subscription", {
          method: "POST",
          body: { application: "MERCHANT", token },
        });
        if (prompt) await kvSet("push.disabled", "0");
        return true;
      });
      if (!registered) return;
      setMessage(t("push.enabled"));
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.problem.detail : t("push.error"),
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!headless || !scope || !navigationKey || unsupported) return;
    let cancelled = false;
    const cleanup: Array<() => void> = [];
    void import("expo-notifications")
      .then(async (notifications) => {
        if (cancelled) return;
        notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        const refresh = () => {
          void client.invalidateQueries({ queryKey: ["orders"] });
          void client.invalidateQueries({ queryKey: ["reservations"] });
          void client.invalidateQueries({ queryKey: ["notifications"] });
          void client.invalidateQueries({ queryKey: ["merchant"] });
        };
        const received = notifications.addNotificationReceivedListener(refresh);
        const open = (response: NotificationResponse) => {
          if (cancelled || useAuthStore.getState().sessionScope !== scope)
            return;
          refresh();
          const data = response.notification.request.content.data;
          if (data.kind === "ORDER") router.push("/orders");
          else router.push("/manage");
          void notifications.clearLastNotificationResponseAsync();
        };
        const response =
          notifications.addNotificationResponseReceivedListener(open);
        const tokenChange = notifications.addPushTokenListener(() => {
          void register(false);
        });
        cleanup.push(
          () => received.remove(),
          () => response.remove(),
          () => tokenChange.remove(),
        );
        const initial = await notifications.getLastNotificationResponseAsync();
        if (initial && !cancelled) open(initial);
        if (!cancelled) void register(false);
      })
      .catch(() => {
        if (!cancelled) setMessage(t("push.error"));
      });
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") void register(false);
    });
    return () => {
      cancelled = true;
      cleanup.forEach((fn) => fn());
      foreground.remove();
    };
    // Registration follows account/organization changes, never each token rotation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    scope,
    organizationId,
    unsupported,
    client,
    router,
    headless,
    navigationKey,
  ]);
  if (!scope || headless) return null;
  return (
    <View
      style={{
        backgroundColor: tokens.color.surface.white,
        borderRadius: tokens.radius.card,
        padding: tokens.spacing.md,
        gap: tokens.spacing.sm,
      }}
    >
      <AppText variant="subtitle">{t("push.title")}</AppText>
      <AppText variant="caption">
        {unsupported ? t("push.developmentBuild") : t("push.hint")}
      </AppText>
      <Button
        variant="outline"
        label={t("push.activate")}
        loading={busy}
        disabled={unsupported}
        onPress={() => void register(true)}
      />
      <Button
        variant="ghost"
        label={t("push.disable")}
        disabled={busy}
        onPress={() => {
          changePushPreference();
          setBusy(true);
          void serializePushSubscription(async () => {
            await kvSet("push.disabled", "1");
            if (useAuthStore.getState().sessionScope !== scope) return;
            await apiRequest("/me/push-subscription", { method: "DELETE" });
            setMessage(t("push.disabled"));
          })
            .catch(() => setMessage(t("push.error")))
            .finally(() => setBusy(false));
        }}
      />
      {message ? (
        <AppText selectable accessibilityLiveRegion="polite">
          {message}
        </AppText>
      ) : null}
    </View>
  );
}
