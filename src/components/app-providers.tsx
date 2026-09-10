import { OfflineSync } from "@/offline/queue-panel";
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";

import { fetchMe, refreshTokens } from "@/api/auth";
import { ApiError } from "@/api/envelope";
import { BrandIntro } from "@/components/brand-intro";
import { ProfileOnboarding } from "@/components/profile-onboarding";
import { kvGet, kvSet } from "@/store/kv-store";
import { tokens } from "@/theme";
import { useAuthStore } from "@/store/auth-store";
import { PushSettings } from "@/features/notifications/push-settings";

void SplashScreen.preventAutoHideAsync();

const INTRO_KEY = "onmangeou.restaurant.intro.seen.v2";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      networkMode: "always",
      staleTime: 30_000,
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((next, previous) => {
      if (
        next.sessionScope !== previous.sessionScope ||
        next.organizationId !== previous.organizationId
      )
        queryClient.clear();
    });
    const appState = AppState.addEventListener("change", (status) => {
      if (Platform.OS !== "web") focusManager.setFocused(status === "active");
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, []);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const hydrate = useAuthStore((state) => state.hydrate);
  const hydrated = useAuthStore((state) => state.hydrated);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const organizationId = useAuthStore((state) => state.organizationId);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clear);
  const [scopeRecoveryDone, setScopeRecoveryDone] = useState(false);
  const [intro, setIntro] = useState<"loading" | "play" | "done">("loading");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Sessions created by older versions of the restaurant app may have a valid
  // refresh token but no persisted organization id. Refreshing such a session
  // produces an identity-only access token, which is valid but has no merchant
  // permissions and therefore leads to a confusing 403 on establishment reads.
  // Recover the merchant scope once at boot before mounting data consumers.
  useEffect(() => {
    if (!hydrated || !refreshToken || organizationId || scopeRecoveryDone) return;

    let cancelled = false;
    void (async () => {
      try {
        const identityTokens = await refreshTokens(refreshToken);
        if (cancelled) return;
        await setSession(identityTokens, null, true);

        const me = await fetchMe();
        if (cancelled) return;
        const membership = me.memberships[0];
        if (!membership) {
          setScopeRecoveryDone(true);
          return;
        }

        const scopedTokens = await refreshTokens(
          identityTokens.refreshToken,
          membership.organizationId,
        );
        if (cancelled) return;
        await setSession(scopedTokens, membership.organizationId, true);
      } catch (error) {
        if (cancelled) return;
        // A rejected refresh means the persisted session is no longer usable.
        // Network failures are not proof of revocation and must preserve offline data.
        if (error instanceof ApiError && error.problem.status === 401) {
          await clearSession();
        }
        setScopeRecoveryDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    clearSession,
    hydrated,
    organizationId,
    refreshToken,
    scopeRecoveryDone,
    setSession,
  ]);

  useEffect(() => {
    void kvGet(INTRO_KEY).then((seen) => {
      setIntro(seen === "1" ? "done" : "play");
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded && hydrated && intro !== "loading") {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hydrated, intro]);

  const finishIntro = useCallback(() => {
    void kvSet(INTRO_KEY, "1");
    setIntro("done");
  }, []);

  const needsScopeRecovery =
    hydrated && Boolean(refreshToken) && !organizationId && !scopeRecoveryDone;

  if (!fontsLoaded || !hydrated || intro === "loading" || needsScopeRecovery) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={tokens.color.brand.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PushSettings headless />
      <OfflineSync />
      <View style={styles.shell}>
        <ProfileOnboarding>{children}</ProfileOnboarding>
        {intro === "play" ? <BrandIntro onDone={finishIntro} /> : null}
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.color.brand.deep,
  },
  shell: { flex: 1 },
});
