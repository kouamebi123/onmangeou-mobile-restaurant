import { StyleSheet, View } from 'react-native';

import { tokens } from '@/theme';

interface SkeletonProps {
  height?: number;
  width?: number | `${number}%`;
}

export function Skeleton({ height = 16, width = '100%' }: SkeletonProps) {
  return <View style={[styles.block, { height, width }]} />;
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: tokens.color.surface.mint,
    borderRadius: tokens.radius.sm,
  },
});
