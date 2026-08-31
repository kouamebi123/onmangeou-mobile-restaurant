import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { tokens } from '@/theme';

export function SectionHeading({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <View style={styles.wrap}>
      {kicker ? (
        <AppText variant="caption" color={tokens.color.brand.primary} style={styles.kicker}>
          {kicker}
        </AppText>
      ) : null}
      <AppText variant="subtitle">{title}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.xxs },
  kicker: { fontFamily: tokens.typography.family.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },
});
