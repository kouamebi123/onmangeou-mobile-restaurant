import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { BrandIntro } from '@/components/brand-intro';
import { ProfileOnboarding } from '@/components/profile-onboarding';
import { kvGet, kvSet } from '@/store/kv-store';
import { tokens } from '@/theme';
import { useAuthStore } from '@/store/auth-store';

void SplashScreen.preventAutoHideAsync();

const INTRO_KEY = 'onmangeou.restaurant.intro.seen.v2';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
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
      if (previous.sessionId && next.sessionId !== previous.sessionId) queryClient.clear();
    });
    const appState = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
    });
    return () => { unsubscribe(); appState.remove(); };
  }, []);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const hydrate = useAuthStore((state) => state.hydrate);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [intro, setIntro] = useState<'loading' | 'play' | 'done'>('loading');

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    void kvGet(INTRO_KEY).then((seen) => {
      setIntro(seen === '1' ? 'done' : 'play');
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded && hydrated && intro !== 'loading') {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hydrated, intro]);

  const finishIntro = useCallback(() => {
    void kvSet(INTRO_KEY, '1');
    setIntro('done');
  }, []);

  if (!fontsLoaded || !hydrated || intro === 'loading') {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={tokens.color.brand.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.shell}>
        <ProfileOnboarding>{children}</ProfileOnboarding>
        {intro === 'play' ? <BrandIntro onDone={finishIntro} /> : null}
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.brand.deep,
  },
  shell: { flex: 1 },
});
