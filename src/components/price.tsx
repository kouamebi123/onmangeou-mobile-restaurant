import { StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { formatFcfa } from '@/theme/format-fcfa';
import { tokens } from '@/theme';
import type { MoneyView } from '@/api/types';

interface PriceProps {
  value: MoneyView | string | null;
}

export function Price({ value }: PriceProps) {
  if (value === null) {
    return null;
  }
  const label = typeof value === 'string' ? formatFcfa(value) : value.formatted;
  return (
    <AppText variant="subtitle" style={styles.price}>
      {label}
    </AppText>
  );
}

const styles = StyleSheet.create({
  price: {
    fontVariant: ['tabular-nums'],
    color: tokens.color.brand.deep,
  },
});
