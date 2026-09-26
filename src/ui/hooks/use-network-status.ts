import { useEffect, useState } from 'react';
import { shouldSkipNetworkExtras } from '../../adapters/weather-service.ts';

export interface NetworkStatusState {
  isOffline: boolean;
  isLowBandwidth: boolean;
  saveData: boolean;
  effectiveType: string;
}

function readNetworkState(): NetworkStatusState {
  if (typeof navigator === 'undefined') {
    return {
      isOffline: false,
      isLowBandwidth: false,
      saveData: false,
      effectiveType: '4g'
    };
  }

  const navWithConn = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };

  const isOffline = navigator.onLine === false;
  const saveData = Boolean(navWithConn.connection?.saveData);
  const effectiveType = navWithConn.connection?.effectiveType ?? '4g';
  const isLowBandwidth = shouldSkipNetworkExtras({
    offline: isOffline,
    saveData,
    effectiveType
  });

  return {
    isOffline,
    isLowBandwidth,
    saveData,
    effectiveType
  };
}

export function useNetworkStatus(): NetworkStatusState {
  const [status, setStatus] = useState<NetworkStatusState>(() => readNetworkState());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => setStatus(readNetworkState());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    const navWithConn = navigator as Navigator & {
      connection?: EventTarget;
    };
    navWithConn.connection?.addEventListener?.('change', update);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      navWithConn.connection?.removeEventListener?.('change', update);
    };
  }, []);

  return status;
}
