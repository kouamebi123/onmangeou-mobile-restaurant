import { Redirect, Tabs } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchEntitlements, isMerchantTabEnabled } from '@/api/merchant';
import { TabIcon } from '@/components/tab-icon';
import { usePendingOrders } from '@/features/orders/use-pending-orders';
import { t } from '@/i18n';
import { tokens } from '@/theme';
import { useAuthStore } from '@/store/auth-store';

export default function MerchantTabsLayout() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!hydrated) {
    return null;
  }

  if (!accessToken) {
    return <Redirect href="/" />;
  }

  return <MerchantTabs accessToken={accessToken} />;
}

function MerchantTabs({ accessToken }: { accessToken: string }) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom - 14, 0);
  const entitlements = useQuery({
    queryKey: ['merchant', 'entitlements'],
    queryFn: () => fetchEntitlements(),
    enabled: Boolean(accessToken),
  });

  const enabled = entitlements.data?.enabledModules ?? [];
  const ordersEnabled = isMerchantTabEnabled('orders', enabled);
  const pendingOrders = usePendingOrders(Boolean(accessToken) && entitlements.isSuccess && ordersEnabled);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Changement d'onglet en fondu : un écran ne remplace jamais l'autre d'un coup.
        animation: 'fade',
        tabBarActiveTintColor: tokens.color.brand.primary,
        tabBarInactiveTintColor: tokens.color.text.muted,
        tabBarStyle: {
          backgroundColor: tokens.color.surface.white,
          borderTopColor: tokens.color.border.default,
          height: 64 + bottomPad,
          paddingBottom: bottomPad,
        },
        // Five tabs on a narrow phone: « Commandes » was cut to « Comman… ».
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarAllowFontScaling: false,
        tabBarLabelStyle: {
          fontFamily: tokens.typography.family.semibold,
          fontSize: 11,
          letterSpacing: -0.1,
        },
      }}
    >
      <Tabs.Screen
        name="activity"
        options={{
          title: t('tabs.activity'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="activity" color={color} focused={focused} />,
          href: isMerchantTabEnabled('activity', enabled) ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabs.orders'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="orders" color={color} focused={focused} />,
          href: ordersEnabled ? undefined : null,
          tabBarBadge: pendingOrders > 0 ? pendingOrders : undefined,
          tabBarBadgeStyle: {
            backgroundColor: tokens.color.brand.accent,
            color: tokens.color.text.onBrand,
            fontFamily: tokens.typography.family.semibold,
            fontSize: 11,
          },
          tabBarAccessibilityLabel:
            pendingOrders > 0
              ? `${t('tabs.orders')}, ${t('orders.pendingBadge', { count: String(pendingOrders) })}`
              : t('tabs.orders'),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: t('tabs.catalog'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="catalog" color={color} focused={focused} />,
          href: isMerchantTabEnabled('catalog', enabled) ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: t('tabs.manage'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="manage" color={color} focused={focused} />,
          href: isMerchantTabEnabled('manage', enabled) ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="more" color={color} focused={focused} />,
          href: isMerchantTabEnabled('more', enabled) ? undefined : null,
        }}
      />
      <Tabs.Screen name="plan" options={{ href: null }} />
    </Tabs>
  );
}
