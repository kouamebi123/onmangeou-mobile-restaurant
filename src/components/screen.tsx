import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/offline-banner';
import { tokens } from '@/theme';

interface ScreenProps extends ScrollViewProps {
  children: ReactNode;
  scroll?: boolean;
}

export function Screen({ children, scroll = true, ...rest }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <OfflineBanner />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            {...rest}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.content}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.color.brand.cream,
  },
  flex: { flex: 1 },
  content: {
    padding: tokens.layout.screenPadding,
    paddingBottom: tokens.spacing.xxl + tokens.spacing.xl,
    gap: tokens.spacing.md,
    flexGrow: 1,
  },
});
