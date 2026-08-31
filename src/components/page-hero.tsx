import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/app-text';
import { tokens } from '@/theme';

export function HeroBlobs() {
  return (
    <>
      <View style={[styles.blob, styles.blobOne]} />
      <View style={[styles.blob, styles.blobTwo]} />
      <View style={[styles.blob, styles.blobThree]} />
    </>
  );
}

export function PageHero({
  icon,
  kicker,
  title,
  subtitle,
  hideIcon,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  kicker?: string;
  title: string;
  subtitle?: string;
  hideIcon?: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={styles.hero}>
      <HeroBlobs />
      {hideIcon ? null : (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={22} color={tokens.color.brand.deep} />
        </View>
      )}
      {children}
      {kicker ? (
        <AppText variant="caption" color={tokens.color.brand.accent} style={styles.kicker}>
          {kicker}
        </AppText>
      ) : null}
      <AppText variant="title" color={tokens.color.text.onBrand} style={styles.title}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="muted" color={tokens.color.surface.mint}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

export function HintRow({
  icon,
  title,
  detail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.hint}>
      <View style={styles.hintIcon}>
        <Ionicons name={icon} size={18} color={tokens.color.brand.primary} />
      </View>
      <View style={styles.hintBody}>
        <AppText variant="subtitle" style={styles.hintTitle}>
          {title}
        </AppText>
        <AppText variant="muted">{detail}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: tokens.spacing.sm,
    padding: tokens.spacing.lg,
    paddingBottom: tokens.spacing.lg,
    marginHorizontal: -tokens.layout.screenPadding,
    marginTop: -tokens.layout.screenPadding,
    backgroundColor: tokens.color.brand.deep,
    overflow: 'hidden',
    position: 'relative',
  },
  blob: { position: 'absolute', borderRadius: 999 },
  blobOne: {
    width: 180,
    height: 180,
    right: -40,
    top: -70,
    backgroundColor: tokens.color.brand.primary,
    opacity: 0.45,
  },
  blobTwo: {
    width: 120,
    height: 120,
    left: -36,
    bottom: -28,
    backgroundColor: tokens.color.brand.accent,
    opacity: 0.28,
  },
  blobThree: {
    width: 72,
    height: 72,
    right: 88,
    bottom: 16,
    backgroundColor: tokens.color.surface.mint,
    opacity: 0.2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.color.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: tokens.typography.family.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { fontSize: tokens.typography.size.xxl },
  hint: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    padding: tokens.spacing.md,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  hintIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.surface.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBody: { flex: 1, gap: 2 },
  hintTitle: { fontSize: tokens.typography.size.md },
});
