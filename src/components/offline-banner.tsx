import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { t } from '@/i18n';
import { useOnlineStatus } from '@/offline/network';
import { tokens } from '@/theme';

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) {
    return null;
  }
  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <AppText variant="caption" color={tokens.color.text.onBrand}>
        {t('offline.banner')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: tokens.color.brand.deep,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
});
