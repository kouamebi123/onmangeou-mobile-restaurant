import * as Network from 'expo-network';
import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    const read = async () => {
      const state = await Network.getNetworkStateAsync();
      if (mounted) {
        setOnline(state.isConnected !== false && state.isInternetReachable !== false);
      }
    };

    void read();
    const subscription = Network.addNetworkStateListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return online;
}
