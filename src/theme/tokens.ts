import raw from './onmangeou-tokens.json';

export const tokens = {
  color: {
    brand: {
      deep: raw.color.brand.deep.value,
      primary: raw.color.brand.primary.value,
      accent: raw.color.brand.accent.value,
      cream: raw.color.brand.cream.value,
    },
    text: {
      primary: raw.color.text.primary.value,
      onBrand: raw.color.text.onBrand.value,
      muted: raw.color.text.muted.value,
    },
    border: {
      default: raw.color.border.default.value,
    },
    surface: {
      mint: raw.color.surface.mint.value,
      white: raw.color.surface.white.value,
    },
    feedback: {
      error: raw.color.feedback.error.value,
      warning: raw.color.feedback.warning.value,
      success: raw.color.feedback.success.value,
      info: raw.color.feedback.info.value,
    },
  },
  typography: {
    family: {
      regular: 'Inter_400Regular',
      semibold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
    },
    size: {
      xs: raw.typography.size.xs.value,
      sm: raw.typography.size.sm.value,
      md: raw.typography.size.md.value,
      lg: raw.typography.size.lg.value,
      xl: raw.typography.size.xl.value,
      xxl: raw.typography.size.xxl.value,
      xxxl: raw.typography.size.xxxl.value,
    },
    lineHeight: {
      tight: raw.typography.lineHeight.tight.value,
      normal: raw.typography.lineHeight.normal.value,
      relaxed: raw.typography.lineHeight.relaxed.value,
    },
  },
  spacing: {
    xxs: raw.spacing.xxs.value,
    xs: raw.spacing.xs.value,
    sm: raw.spacing.sm.value,
    md: raw.spacing.md.value,
    lg: raw.spacing.lg.value,
    xl: raw.spacing.xl.value,
    xxl: raw.spacing.xxl.value,
  },
  radius: {
    sm: raw.radius.sm.value,
    md: raw.radius.md.value,
    card: raw.radius.card.value,
    pill: raw.radius.pill.value,
  },
  layout: {
    screenPadding: raw.layout.screenPaddingMobile.value,
    minTouchTarget: raw.layout.minTouchTarget.value,
  },
  locale: {
    currencyLabel: raw.locale.currencyLabel.value,
    currencyDecimals: raw.locale.currencyDecimals.value,
  },
} as const;

export type Tokens = typeof tokens;
