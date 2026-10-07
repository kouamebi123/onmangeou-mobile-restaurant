import { StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Appear } from '@/components/motion';
import { t } from '@/i18n';
import { tokens } from '@/theme';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Appear style={styles.wrap}>
      <AppText variant="subtitle" style={styles.title}>
        {message ?? t('errors.generic')}
      </AppText>
      {onRetry ? <Button label={t('common.retry')} onPress={onRetry} /> : null}
    </Appear>
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
