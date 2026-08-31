import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store/auth-store';

export default function IndexRoute() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!hydrated) {
    return null;
  }

  if (!accessToken) {
    return <Redirect href="/(auth)" />;
  }

  return <Redirect href="/(merchant)/activity" />;
}
