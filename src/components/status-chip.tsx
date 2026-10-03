import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { tokens } from '@/theme';

export type ChipTone = 'neutral' | 'progress' | 'success' | 'danger';

const TONES: Record<ChipTone, { background: string; text: string; dot: string }> = {
  neutral: { background: tokens.color.brand.cream, text: tokens.color.text.muted, dot: tokens.color.text.muted },
  progress: { background: tokens.color.brand.cream, text: tokens.color.feedback.warning, dot: tokens.color.brand.accent },
  success: { background: tokens.color.surface.mint, text: tokens.color.brand.primary, dot: tokens.color.brand.primary },
  danger: { background: tokens.color.brand.cream, text: tokens.color.feedback.error, dot: tokens.color.feedback.error },
};

/** État d'une commande ou d'une réservation : une couleur par nature d'état, jamais décorative. */
export function StatusChip({ label, tone = 'neutral' }: { label: string; tone?: ChipTone }) {
  const palette = TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.background }]}>
      <View style={[styles.dot, { backgroundColor: palette.dot }]} />
      <AppText variant="caption" color={palette.text} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontFamily: tokens.typography.family.semibold },
});
