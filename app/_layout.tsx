import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProviders } from '@/components/app-providers';
import { tokens } from '@/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: tokens.color.brand.cream }}>
      <AppProviders>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: tokens.color.brand.cream },
            // Connexion ↔ espace commerçant : fondu plutôt qu'un glissement latéral.
            animation: 'fade',
            animationDuration: 280,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(merchant)" />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
