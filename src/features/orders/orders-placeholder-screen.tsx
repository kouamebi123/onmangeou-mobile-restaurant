import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/app-text';
import { HintRow, PageHero } from '@/components/page-hero';
import { Screen } from '@/components/screen';
import { t } from '@/i18n';
import { tokens } from '@/theme';

export function OrdersPlaceholderScreen() {
  return (
    <Screen>
      <PageHero
        icon="receipt-outline"
        kicker={t('app.name')}
        title={t('tabs.orders')}
        subtitle={t('orders.hero')}
      />

      <View style={styles.soon}>
        <View style={styles.soonMark}>
          <Ionicons name="bag-handle" size={36} color={tokens.color.text.onBrand} />
        </View>
        <AppText variant="caption" color={tokens.color.brand.accent} style={styles.soonKicker}>
          {t('comingSoon.title')}
        </AppText>
        <AppText variant="subtitle" style={styles.soonTitle}>
          {t('comingSoon.orders')}
        </AppText>
        <AppText variant="muted" style={styles.soonLead}>
          {t('orders.lead')}
        </AppText>
      </View>

      <HintRow icon="flash-outline" title={t('orders.track')} detail={t('orders.trackDetail')} />
      <HintRow icon="time-outline" title={t('orders.history')} detail={t('orders.historyDetail')} />
      <HintRow icon="notifications-outline" title={t('orders.alerts')} detail={t('orders.alertsDetail')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  soon: {
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.lg,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  soonMark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: tokens.color.brand.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soonKicker: {
    fontFamily: tokens.typography.family.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  soonTitle: { textAlign: 'center' },
  soonLead: { textAlign: 'center' },
});
