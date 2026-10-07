import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { tokens } from '@/theme';
import { motion, staggerDelay } from '@/theme/motion';

/**
 * Le téléphone peut demander de réduire les animations : dans ce cas tout
 * s'affiche directement, sans mouvement.
 */
let reduceMotion = false;
void AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    reduceMotion = enabled;
  })
  .catch(() => undefined);
AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  reduceMotion = enabled;
});

export function prefersReducedMotion(): boolean {
  return reduceMotion;
}

interface AppearProps {
  children: ReactNode;
  /** Retard avant l'apparition, en millisecondes. */
  delay?: number;
  /** Rang dans une liste : les premiers éléments arrivent l'un après l'autre. */
  index?: number;
  /** Le bloc garde par défaut l'espacement vertical d'un écran. */
  style?: StyleProp<ViewStyle>;
  /**
   * Pour un contenu qui reste monté mais que l'on masque puis remontre (onglet
   * interne, section conservée) : l'apparition se rejoue à chaque retour.
   */
  visible?: boolean;
}

/**
 * Fait apparaître son contenu en douceur (fondu et légère montée) au lieu de
 * le poser d'un coup. À utiliser pour tout contenu qui arrive après coup :
 * données chargées, étape suivante, message, section choisie.
 */
export function Appear({ children, delay, index, style, visible = true }: AppearProps) {
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  // Le retard est lu au lancement : un élément qui change de rang dans une
  // liste rafraîchie ne doit pas rejouer son apparition.
  const wait = useRef(0);
  wait.current = delay ?? (index === undefined ? 0 : staggerDelay(index));
  const played = useRef(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    if (played.current) {
      progress.setValue(0);
    }
    played.current = true;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.appearMs,
      delay: wait.current,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, visible]);

  return (
    <Animated.View
      style={[
        styles.stack,
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [motion.rise, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

interface ExpandableProps {
  open: boolean;
  children: ReactNode;
  /** Espacement du parent, absorbé pendant l'ouverture pour éviter un à-coup. */
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Section repliable : s'ouvre et se referme en glissant, le contenu situé
 * dessous suit le mouvement. Le contenu n'existe que lorsque la section est
 * ouverte ou en train de se refermer.
 */
export function Expandable({ open, children, gap = 0, style }: ExpandableProps) {
  const [mounted, setMounted] = useState(open);
  const [settled, setSettled] = useState(open);
  const [height, setHeight] = useState(0);
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;

  if (open && !mounted) {
    setMounted(true);
  }
  if (!open && settled) {
    setSettled(false);
  }

  useEffect(() => {
    if (!mounted || (open && settled)) {
      return;
    }
    if (reduceMotion) {
      progress.setValue(open ? 1 : 0);
      if (open) setSettled(true);
      else setMounted(false);
      return;
    }
    // La hauteur doit être connue avant d'ouvrir : on attend la première mesure.
    if (open && height === 0) {
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: motion.expandMs,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      if (open) setSettled(true);
      else setMounted(false);
    });
    return () => animation.stop();
  }, [height, mounted, open, progress, settled]);

  if (!mounted) {
    return null;
  }

  // Un seul arbre dans tous les états : le contenu n'est jamais remonté, il
  // garde donc sa saisie, son focus et ses propres animations. Au repos la
  // mise en page est ordinaire ; pendant le mouvement la hauteur est pilotée.
  return (
    <Animated.View
      style={
        settled
          ? null
          : {
              overflow: 'hidden',
              opacity: progress,
              height: progress.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
              marginTop: progress.interpolate({ inputRange: [0, 1], outputRange: [-gap, 0] }),
            }
      }
    >
      <View
        style={[styles.stack, style, settled ? null : styles.measured]}
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        {children}
      </View>
    </Animated.View>
  );
}

/**
 * Voile d'ouverture : posé sur l'application au démarrage, à la couleur de
 * l'écran de chargement, il s'efface pour dévoiler le premier écran au lieu de
 * le laisser surgir.
 */
export function Uncover({ color }: { color: string }) {
  const [done, setDone] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (done) {
      return;
    }
    const animation = Animated.timing(opacity, {
      toValue: 0,
      duration: motion.appearMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) setDone(true);
    });
    return () => animation.stop();
  }, [done, opacity]);

  if (done) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.cover, { backgroundColor: color, opacity }]}
    />
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, zIndex: 20 },
  stack: { gap: tokens.spacing.md },
  measured: { position: 'absolute', top: 0, left: 0, right: 0 },
});
