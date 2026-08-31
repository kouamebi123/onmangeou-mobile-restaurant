import { Text, type TextProps, StyleSheet } from 'react-native';

import { tokens } from '@/theme';

type Variant = 'body' | 'muted' | 'title' | 'subtitle' | 'caption' | 'button';

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
}

const variantStyle = StyleSheet.create({
  body: {
    fontFamily: tokens.typography.family.regular,
    fontSize: tokens.typography.size.md,
    lineHeight: Math.round(tokens.typography.size.md * tokens.typography.lineHeight.normal),
    color: tokens.color.text.primary,
  },
  muted: {
    fontFamily: tokens.typography.family.regular,
    fontSize: tokens.typography.size.sm,
    lineHeight: Math.round(tokens.typography.size.sm * tokens.typography.lineHeight.normal),
    color: tokens.color.text.muted,
  },
  title: {
    fontFamily: tokens.typography.family.bold,
    fontSize: tokens.typography.size.xxl,
    lineHeight: Math.round(tokens.typography.size.xxl * tokens.typography.lineHeight.tight),
    color: tokens.color.brand.deep,
  },
  subtitle: {
    fontFamily: tokens.typography.family.semibold,
    fontSize: tokens.typography.size.lg,
    lineHeight: Math.round(tokens.typography.size.lg * tokens.typography.lineHeight.tight),
    color: tokens.color.brand.deep,
  },
  caption: {
    fontFamily: tokens.typography.family.regular,
    fontSize: tokens.typography.size.xs,
    lineHeight: Math.round(tokens.typography.size.xs * tokens.typography.lineHeight.normal),
    color: tokens.color.text.muted,
  },
  button: {
    fontFamily: tokens.typography.family.semibold,
    fontSize: tokens.typography.size.md,
    color: tokens.color.text.onBrand,
  },
});

export function AppText({ variant = 'body', color, style, ...rest }: AppTextProps) {
  return <Text style={[variantStyle[variant], color ? { color } : null, style]} {...rest} />;
}
