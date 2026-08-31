import { Redirect, Tabs } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { fetchEntitlements, isMerchantTabEnabled } from '@/api/merchant';
import { TabIcon } from '@/components/tab-icon';
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
  const entitlements = useQuery({
    queryKey: ['merchant', 'entitlements'],
    queryFn: () => fetchEntitlements(),
    enabled: Boolean(accessToken),
  });

  const enabled = entitlements.data?.enabledModules ?? [];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.color.brand.primary,
        tabBarInactiveTintColor: tokens.color.text.muted,
        tabBarStyle: {
          backgroundColor: tokens.color.surface.white,
          borderTopColor: tokens.color.border.default,
          height: 64,
        },
        tabBarLabelStyle: {
          fontFamily: tokens.typography.family.semibold,
          fontSize: tokens.typography.size.xs,
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
          href: isMerchantTabEnabled('orders', enabled) ? undefined : null,
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
