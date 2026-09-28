import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { ApiError } from './http';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Lists are refetched when a screen comes back into view; within 30 s that's skipped
      staleTime: 30_000,
      // Kept (and saved on the device) for a day, so the app opens with the last data
      gcTime: 24 * 60 * 60 * 1000,
      // Retry network and server errors, not "not found" or "not allowed"
      retry: (failureCount, error) =>
        failureCount < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
    mutations: { retry: false },
  },
});

/** Saves the query cache on the device, so lists show straight away and offline */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'hotel-mgmt-query-cache',
  throttleTime: 2000,
});

export const persistMaxAge = 24 * 60 * 60 * 1000;

/** Signing out: forget everything the previous user loaded */
export async function clearQueryCache() {
  queryClient.clear();
  await queryPersister.removeClient();
}

// React Native has no window focus/online events: tell React Query about the app coming to the
// foreground (refetch stale data) and about the connection (pause while offline, resume after)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false))
  );
}

/**
 * Refetches when the screen comes back into view (another tab, or back from a screen that may
 * have changed the data). The first focus is skipped: the query has just loaded.
 */
export function useRefreshOnFocus(refetch: () => unknown) {
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  });

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refetchRef.current();
    }, [])
  );
}

/**
 * Pull-to-refresh state. Kept apart from the query's own fetching flag so background refetches
 * (on focus, after a change) don't show the spinner.
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  return { refreshing, onRefresh };
}
