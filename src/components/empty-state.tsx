import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { tokens } from '@/theme';

interface EmptyStateProps {
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, detail, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="subtitle" style={styles.title}>
        {title}
      </AppText>
      {detail ? (
        <AppText variant="muted" style={styles.title}>
          {detail}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="outline" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.spacing.sm,
    alignItems: 'center',
    padding: tokens.spacing.xl,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
  },
  title: { textAlign: 'center' },
});
