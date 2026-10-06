import { Linking, Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { t } from '@/i18n';
import { tokens } from '@/theme';

const PUBLISHER_URL = 'https://binuxlabs.com';

/** Signature discrète de l'éditeur, en bas d'écran. */
export function Signature() {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${t('app.signedBy')} BinuxLabs`}
      onPress={() => void Linking.openURL(PUBLISHER_URL).catch(() => undefined)}
      hitSlop={8}
      style={styles.wrap}
    >
      <AppText variant="caption" color={tokens.color.text.muted}>
        {t('app.signedBy')}{' '}
        <AppText variant="caption" color={tokens.color.text.muted} style={styles.name}>
          BinuxLabs
        </AppText>
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', paddingVertical: tokens.spacing.sm },
  name: { fontFamily: tokens.typography.family.semibold },
});
