import { useCallback, useEffect, useRef, useState } from 'react';

interface Result<T> {
  key: string;
  data: T | null;
  error: string | null;
}

/**
 * Loads data from the API, with pull-to-refresh support.
 * `key` identifies what is loaded (e.g. the reservation id); changing it reloads.
 */
export function useApi<T>(load: () => Promise<T>, key = '') {
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const [result, setResult] = useState<Result<T> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (forKey: string) => {
    try {
      const data = await loadRef.current();
      setResult({ key: forKey, data, error: null });
    } catch (e) {
      setResult({ key: forKey, data: null, error: e instanceof Error ? e.message : 'Something went wrong' });
    }
  }, []);

  useEffect(() => {
    fetchData(key);
  }, [fetchData, key]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(key);
    setRefreshing(false);
  }, [fetchData, key]);

  const setData = useCallback((data: T) => setResult({ key, data, error: null }), [key]);

  // Results for an earlier key don't count: show loading until the current one arrives
  const current = result?.key === key ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: current === null,
    refreshing,
    refresh,
    setData,
  };
}
