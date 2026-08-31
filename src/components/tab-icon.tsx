import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';

type MerchantTab = 'activity' | 'orders' | 'catalog' | 'manage' | 'more';

const ICONS: Record<MerchantTab, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  activity: { on: 'pulse', off: 'pulse-outline' },
  orders: { on: 'receipt', off: 'receipt-outline' },
  catalog: { on: 'restaurant', off: 'restaurant-outline' },
  manage: { on: 'settings', off: 'settings-outline' },
  more: { on: 'ellipsis-horizontal-circle', off: 'ellipsis-horizontal-circle-outline' },
};

export function TabIcon({
  name,
  color,
  focused,
  size = 22,
}: {
  name: MerchantTab;
  color: ColorValue;
  focused: boolean;
  size?: number;
}) {
  return <Ionicons name={focused ? ICONS[name].on : ICONS[name].off} size={size} color={color} />;
}
