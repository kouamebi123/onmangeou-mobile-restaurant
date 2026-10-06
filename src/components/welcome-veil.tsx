import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Logo } from '@/components/logo';
import { HeroBlobs } from '@/components/page-hero';
import { t } from '@/i18n';
import {
  WELCOME_COVER_MS,
  WELCOME_MAX_VISIBLE_MS,
  remainingVisibleMs,
  useTransitionStore,
} from '@/store/transition-store';
import { tokens } from '@/theme';

/**
 * Transition entre la connexion et l'accueil : un voile aux couleurs de la
 * marque couvre l'écran, salue l'utilisateur pendant que l'accueil se met en
 * place, puis s'efface. Sans effet si le téléphone demande de réduire les animations.
 */
export function WelcomeVeil() {
  const run = useTransitionStore((state) => state.welcomeRun);
  const revealedRun = useTransitionStore((state) => state.revealedRun);
  const revealWelcome = useTransitionStore((state) => state.revealWelcome);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const startedAt = useRef(0);
  const veil = useRef(new Animated.Value(0)).current;
  const mark = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(setReducedMotion)
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription.remove();
  }, []);

  // Arrivée du voile.
  useEffect(() => {
    if (run === 0 || reducedMotion) {
      return;
    }
    veil.setValue(0);
    mark.setValue(0);
    text.setValue(0);
    startedAt.current = Date.now();
    setPlaying(true);
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(veil, {
          toValue: 1,
          duration: WELCOME_COVER_MS - 40,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(mark, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
      Animated.timing(text, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]);
    animation.start();
    const safety = setTimeout(revealWelcome, WELCOME_MAX_VISIBLE_MS);
    return () => {
      animation.stop();
      clearTimeout(safety);
    };
    // `reducedMotion` est lu au lancement : le changer ne doit pas rejouer la transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  // Départ du voile, une fois l'accueil en place et le message lu.
  useEffect(() => {
    if (!playing || revealedRun !== run) {
      return;
    }
    let animation: Animated.CompositeAnimation | null = null;
    const timer = setTimeout(() => {
      animation = Animated.timing(veil, {
        toValue: 2,
        duration: 420,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      });
      animation.start(({ finished }) => {
        if (finished) {
          setPlaying(false);
        }
      });
    }, remainingVisibleMs(startedAt.current, Date.now()));
    return () => {
      clearTimeout(timer);
      animation?.stop();
    };
  }, [playing, revealedRun, run, veil]);

  if (!playing) {
    return null;
  }

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.screen,
        {
          // 0 → 1 : le voile arrive ; 1 → 2 : il s'efface en s'ouvrant légèrement.
          opacity: veil.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
          transform: [{ scale: veil.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1, 1.08] }) }],
        },
      ]}
    >
      <HeroBlobs />
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.badge,
            {
              opacity: mark,
              transform: [{ scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            },
          ]}
        >
          <Logo variant="icon" height={46} />
        </Animated.View>
        <Animated.View
          style={{
            opacity: text,
            transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
        >
          <Text style={styles.title}>{t('transition.welcome')}</Text>
          <Text style={styles.lede}>{t('transition.ready')}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: tokens.color.brand.deep,
    overflow: 'hidden',
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center', gap: tokens.spacing.md, paddingHorizontal: tokens.spacing.xl, zIndex: 1 },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.color.brand.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: tokens.typography.family.bold,
    fontSize: tokens.typography.size.xxl,
    color: tokens.color.text.onBrand,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  lede: {
    marginTop: tokens.spacing.xxs,
    fontFamily: tokens.typography.family.regular,
    fontSize: tokens.typography.size.md,
    color: tokens.color.surface.mint,
    textAlign: 'center',
  },
});
