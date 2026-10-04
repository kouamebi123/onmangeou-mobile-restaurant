import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Logo } from '@/components/logo';
import { HeroBlobs } from '@/components/page-hero';
import { t } from '@/i18n';
import { tokens } from '@/theme';

export function BrandIntro({ onDone }: { onDone: () => void }) {
  const mark = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const veil = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      onDone();
    };

    const animation = Animated.sequence([
      Animated.spring(mark, { toValue: 1, friction: 8, tension: 42, useNativeDriver: true }),
      Animated.timing(title, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(veil, { toValue: 0, duration: 750, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished) {
        finish();
      }
    });
    const fallback = setTimeout(finish, 4000);
    return () => {
      animation.stop();
      clearTimeout(fallback);
    };
  }, [mark, onDone, title, veil]);

  return (
    <Animated.View pointerEvents="none" style={[styles.screen, { opacity: veil }]}>
      <HeroBlobs />
      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: mark,
            transform: [
              {
                scale: mark.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1],
                }),
              },
              {
                translateY: mark.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          }}
        >
          <View style={styles.badge}>
            <Logo variant="icon" height={52} />
          </View>
          <Text style={styles.brand}>
            OnMange<Text style={styles.accent}>Où</Text>
          </Text>
        </Animated.View>
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: title,
              transform: [
                {
                  translateY: title.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {t('intro.title')}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: tokens.color.brand.deep,
    overflow: 'hidden',
    zIndex: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    gap: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.xl,
    zIndex: 1,
  },
  badge: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: tokens.color.brand.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sm,
  },
  brand: {
    fontFamily: tokens.typography.family.bold,
    fontSize: tokens.typography.size.xxl,
    color: tokens.color.text.onBrand,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  accent: {
    fontFamily: tokens.typography.family.bold,
    color: tokens.color.brand.accent,
  },
  title: {
    fontFamily: tokens.typography.family.regular,
    fontSize: tokens.typography.size.md,
    color: tokens.color.surface.mint,
    textAlign: 'center',
  },
});
