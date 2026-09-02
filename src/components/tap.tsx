import { Platform, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

/**
 * Zone cliquable fiable sur web et mobile.
 *
 * Pressable natif n'expose pas toujours un vrai bouton HTML : les cartes
 * de modules devenaient des `div` inertes dans Expo web.
 */
export function Tap({
  onPress,
  disabled = false,
  checked,
  style,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  checked?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, checked }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        style,
        pressed && !disabled ? { opacity: 0.7 } : null,
        Platform.OS === 'web'
          ? ({ cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none' } as ViewStyle)
          : null,
      ]}
    >
      {children}
    </Pressable>
  );
}
