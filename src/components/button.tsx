import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/app-text';
import { tokens } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const palettes: Record<Variant, { bg: string; text: string; border: string }> = {
  primary: { bg: tokens.color.brand.primary, text: tokens.color.text.onBrand, border: tokens.color.brand.primary },
  secondary: { bg: tokens.color.brand.accent, text: tokens.color.text.onBrand, border: tokens.color.brand.accent },
  outline: { bg: 'transparent', text: tokens.color.brand.deep, border: tokens.color.border.default },
  ghost: { bg: 'transparent', text: tokens.color.brand.primary, border: 'transparent' },
  destructive: { bg: tokens.color.feedback.error, text: tokens.color.text.onBrand, border: tokens.color.feedback.error },
};

export function Button({ label, variant = 'primary', loading = false, disabled, style, ...rest }: ButtonProps) {
  const palette = palettes[variant];
  const isDisabled = Boolean(disabled) || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <AppText variant="button" color={palette.text}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: tokens.layout.minTouchTarget,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },
});
